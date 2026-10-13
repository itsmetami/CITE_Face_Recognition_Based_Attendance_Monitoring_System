import { createClient } from "npm:@supabase/supabase-js@2";

type StaffRole = "teacher" | "secretary";
type AdminAction = "list" | "create" | "update" | "activate" | "deactivate";

const appOrigins = new Set([
  "https://cite-face-recognition-based-attenda.vercel.app",
  "http://localhost:3000",
]);

function getSecretKey() {
  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretMap) return undefined;

  try {
    const parsed = JSON.parse(secretMap) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin && appOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(JSON.stringify(body), { status, headers });
}

function isStaffRole(value: unknown): value is StaffRole {
  return value === "teacher" || value === "secretary";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUserId(userId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !appOrigins.has(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return jsonResponse({ ok: true }, 200, origin);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    console.error("Admin function is missing its Supabase runtime configuration.");
    return jsonResponse({ error: "Staff management is not configured yet." }, 500, origin);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: "Sign in with an active Dean account to continue." }, 401, origin);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonResponse({ error: "Your session is not valid. Please sign in again." }, 401, origin);
  }

  const { data: callerProfile, error: callerError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (callerError || callerProfile?.role !== "dean" || !callerProfile.is_active) {
    return jsonResponse({ error: "Only an active Dean can manage staff accounts." }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, origin);
  }

  const action = body.action as AdminAction;

  if (action === "list") {
    const [profileResult, usersResult] = await Promise.all([
      admin.from("profiles")
        .select("user_id, display_name, role, is_active")
        .in("role", ["teacher", "secretary"])
        .order("display_name"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profileResult.error || usersResult.error) {
      console.error("Could not load staff directory.");
      return jsonResponse({ error: "Could not load staff accounts. Please try again." }, 500, origin);
    }

    const emailById = new Map(usersResult.data.users.map((user) => [user.id, user.email ?? ""]));
    const staff = profileResult.data.map((profile) => ({
      ...profile,
      email: emailById.get(profile.user_id) ?? "",
    }));
    return jsonResponse({ staff }, 200, origin);
  }

  if (action === "create") {
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;

    if (!displayName || displayName.length > 120 || !isValidEmail(email) || password.length < 8 || !isStaffRole(role)) {
      return jsonResponse({ error: "Enter a name, valid staff email, role, and password of at least 8 characters." }, 400, origin);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return jsonResponse({ error: "Could not create this login. Check whether the email is already in use." }, 400, origin);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      display_name: displayName,
      role,
      is_active: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      console.error("Could not create staff profile; removed the incomplete Auth user.");
      return jsonResponse({ error: "The account was not saved. Please check the profile setup and try again." }, 500, origin);
    }

    return jsonResponse({ ok: true }, 201, origin);
  }

  if (action === "update" || action === "activate" || action === "deactivate") {
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!isValidUserId(userId) || userId === authData.user.id) {
      return jsonResponse({ error: "Choose a valid teacher or secretary account." }, 400, origin);
    }

    const { data: targetProfile, error: targetError } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetError || !targetProfile || !isStaffRole(targetProfile.role)) {
      return jsonResponse({ error: "Only teacher and secretary accounts can be managed here." }, 404, origin);
    }

    if (action === "activate" || action === "deactivate") {
      const { error } = await admin
        .from("profiles")
        .update({ is_active: action === "activate" })
        .eq("user_id", userId);
      if (error) {
        console.error("Could not update the staff account status.");
        return jsonResponse({ error: "Could not change this account’s status." }, 500, origin);
      }
      return jsonResponse({ ok: true }, 200, origin);
    }

    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role;
    if (!displayName || displayName.length > 120 || !isValidEmail(email) || !isStaffRole(role)) {
      return jsonResponse({ error: "Enter a name, valid staff email, and teacher or secretary role." }, 400, origin);
    }

    const { data: currentAuthUser, error: currentAuthError } = await admin.auth.admin.getUserById(userId);
    if (currentAuthError || !currentAuthUser.user) {
      return jsonResponse({ error: "Could not find the matching login account." }, 404, origin);
    }
    const oldEmail = currentAuthUser.user.email;
    if (oldEmail !== email) {
      const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });
      if (emailError) {
        return jsonResponse({ error: "Could not update the staff email. Check whether the new email is already in use." }, 400, origin);
      }
    }

    const { error: profileUpdateError } = await admin.from("profiles")
      .update({ display_name: displayName, role })
      .eq("user_id", userId);
    if (profileUpdateError) {
      if (oldEmail && oldEmail !== email) {
        await admin.auth.admin.updateUserById(userId, { email: oldEmail, email_confirm: true });
      }
      console.error("Could not save the staff profile update.");
      return jsonResponse({ error: "Could not save the profile changes. Please try again." }, 500, origin);
    }

    return jsonResponse({ ok: true }, 200, origin);
  }

  return jsonResponse({ error: "Unknown staff management action." }, 400, origin);
});
