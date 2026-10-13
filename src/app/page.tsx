import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DeanStaffPanel } from "@/components/admin/dean-staff-panel";
import { OfficeQrPanel, type OfficeQrCode } from "@/components/attendance/office-qr-panel";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-8 space-y-3 text-center">
          <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            CITE Faculty Attendance
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in with your staff account to continue.</p>
        </div>
        <SignInForm />
      </main>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: staffProfiles } =
    profile?.role === "secretary"
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, role")
          .in("role", ["teacher", "secretary"])
          .order("display_name")
      : { data: null };
  const isOfficeAdmin = profile?.role === "secretary" || profile?.role === "dean";
  const { data: currentQr, error: qrError } = isOfficeAdmin
    ? await supabase
        .from("office_qr_codes")
        .select("token, created_at, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };
  const { data: deanData, error: deanListError } =
    profile?.role === "dean"
      ? await supabase.functions.invoke<{ staff: Array<{ user_id: string; email: string; display_name: string; role: "teacher" | "secretary"; is_active: boolean }> }>(
          "admin-users",
          { body: { action: "list" } },
        )
      : { data: null, error: null };

  if (profile && !profile.is_active) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Account deactivated</CardTitle>
            <CardDescription>Your staff account is inactive. Contact the Dean if you think this is a mistake.</CardDescription>
          </CardHeader>
          <CardContent><SignOutButton /></CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:py-20">
      <header className="space-y-3">
        <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          CITE Faculty Attendance
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile?.role === "secretary" ? "Secretary office" : profile?.role === "dean" ? "Dean dashboard" : "Staff account"}
        </h1>
        <p className="text-sm text-muted-foreground">You are signed in as {user.email}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{profile?.display_name ?? "Profile not set up"}</CardTitle>
          <CardDescription>
            {profile ? `Account role: ${profile.role}` : "Your account is authenticated, but the office has not added a matching staff profile yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">We couldn’t load your profile. Please refresh or contact the office.</p>
          ) : profile ? (
            <p className="text-sm text-muted-foreground">
              {profile.role === "teacher"
                ? "Your account is ready. Teacher attendance scanning will be available in the next step."
                : profile.role === "secretary"
                  ? "Display the office QR below so teachers can scan for their daily time-in and time-out."
                  : "Manage staff accounts and open office tools from your Dean dashboard."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Ask the Dean to add your profile before using staff features.</p>
          )}
          <SignOutButton />
        </CardContent>
      </Card>
      {isOfficeAdmin && (
        <OfficeQrPanel
          initialCode={(currentQr as OfficeQrCode | null) ?? null}
          initialError={qrError ? "Could not load the office QR code. Confirm that migration 004 has run." : null}
        />
      )}
      {profile?.role === "dean" && (
        <DeanStaffPanel
          initialStaff={deanData?.staff ?? []}
          initialError={deanListError ? "Could not load staff accounts. Check that the admin-users function is deployed." : null}
        />
      )}
      {profile?.role === "secretary" && (
        <Card>
          <CardHeader>
            <CardTitle>Staff profiles</CardTitle>
            <CardDescription>Profiles available to the office account under the database access policy.</CardDescription>
          </CardHeader>
          <CardContent>
            {staffProfiles?.length ? (
              <ul className="divide-y divide-border">
                {staffProfiles.map((staff) => (
                  <li key={staff.user_id} className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
                    <span>{staff.display_name}</span>
                    <span className="capitalize text-muted-foreground">{staff.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No staff profiles are available yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
