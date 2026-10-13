import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CiteBrand } from "@/components/brand/cite-brand";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DeanStaffPanel } from "@/components/admin/dean-staff-panel";
import { OfficeQrPanel, type OfficeQrCode } from "@/components/attendance/office-qr-panel";
import { OfficeAttendanceList } from "@/components/attendance/office-attendance-list";
import { TeacherAttendancePanel, type TeacherAttendanceRecord } from "@/components/attendance/teacher-attendance-panel";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-8 lg:py-14">
        <section className="relative isolate flex min-h-[34rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#18231b] p-7 text-white shadow-[0_30px_80px_-36px_rgba(18,36,23,0.55)] sm:p-10">
          <div aria-hidden="true" className="absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-[#e87525]/20 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-[#478458]/25 blur-3xl" />
          <div className="space-y-14">
            <CiteBrand inverse />
            <div className="max-w-lg space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e87525]/35 bg-[#e87525]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#ffb274]">
                <span className="size-1.5 rounded-full bg-[#f28a40]" /> Staff portal
              </span>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                A clearer way to keep track of attendance.
              </h1>
              <p className="max-w-md text-base leading-7 text-white/65">
                Secure staff access, quick QR check-ins, and one reliable record for the CITE office.
              </p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            {[
              ["01", "Staff accounts"],
              ["02", "Quick QR scans"],
              ["03", "Office records"],
            ].map(([number, label]) => (
              <div key={number} className="flex items-center gap-3 text-sm text-white/75">
                <span className="grid size-8 place-items-center rounded-xl bg-white/8 text-xs font-bold text-[#f49a5d]">{number}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md space-y-6 lg:max-w-none">
          <div className="space-y-2 px-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#37754a] dark:text-[#91cf9b]">Welcome back</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sign in to continue</h2>
            <p className="text-sm leading-6 text-muted-foreground">Use the staff email and password provided by the CITE office.</p>
          </div>
          <SignInForm />
          <p className="text-center text-xs text-muted-foreground">Need access? Contact your department administrator.</p>
        </section>
      </main>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: staffProfiles, error: staffProfilesError } =
    profile?.role === "secretary" || profile?.role === "dean"
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, role")
          .eq("role", "teacher")
          .order("display_name")
      : { data: null, error: null };
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
  const { data: attendanceRecord, error: attendanceError } =
    profile?.role === "teacher"
      ? await supabase
          .from("attendance_records")
          .select("id, work_date, time_in, time_out, time_out_status")
          .order("work_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

  if (profile && !profile.is_active) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-5 px-4 py-12">
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <header className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CiteBrand />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-56 truncate text-sm font-semibold">{profile?.display_name ?? user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#18231b] via-[#1d2b20] to-[#285237] px-6 py-8 text-white shadow-[0_26px_70px_-38px_rgba(18,36,23,0.55)] sm:px-9 sm:py-10">
          <div aria-hidden="true" className="absolute -right-16 -top-28 -z-10 size-80 rounded-full bg-[#e87525]/20 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                <span className="size-1.5 rounded-full bg-[#ef8a43]" />
                {profile?.role ?? "Staff account"} portal
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {profile?.role === "secretary"
                    ? "Secretary office"
                    : profile?.role === "dean"
                      ? "Dean dashboard"
                      : profile?.role === "teacher"
                        ? `Welcome, ${profile.display_name}`
                        : "Your staff account"}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                  {error
                    ? "We couldn’t load your profile. Please refresh or contact the office."
                    : profile?.role === "teacher"
                      ? "Scan the office QR to record your daily time-in and time-out. Your attendance stays in one clear place."
                      : profile?.role === "secretary"
                        ? "Display the office QR, review faculty attendance, and download records for your reports."
                        : profile?.role === "dean"
                          ? "Manage staff access and review faculty attendance from one dashboard."
                          : "Your account is authenticated, but the office has not added a matching staff profile yet."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/75 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-white/45">Signed in as</p>
              <p className="mt-1 max-w-64 truncate font-medium text-white">{user.email}</p>
            </div>
          </div>
        </section>
      </header>
      {isOfficeAdmin && (
        <OfficeQrPanel
          initialCode={(currentQr as OfficeQrCode | null) ?? null}
          initialError={qrError ? "Could not load the office QR code. Confirm that migration 004 has run." : null}
        />
      )}
      {profile?.role === "teacher" && (
        <TeacherAttendancePanel
          initialRecord={(attendanceRecord as TeacherAttendanceRecord | null) ?? null}
          initialError={attendanceError ? "Could not load your attendance record. Please refresh the page." : null}
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
      {(profile?.role === "secretary" || profile?.role === "dean") && (
        <OfficeAttendanceList
          teachers={(staffProfiles ?? []).map((staff) => ({
            user_id: staff.user_id,
            display_name: staff.display_name,
          }))}
          initialError={staffProfilesError ? "Could not load teacher names. Attendance names may be unavailable." : null}
        />
      )}
    </main>
  );
}
