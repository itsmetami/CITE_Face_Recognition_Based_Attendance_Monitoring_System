import { InviteAcceptanceForm } from "@/components/auth/invite-acceptance-form";

export default function AcceptInvitePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-8 space-y-3 text-center">
        <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          CITE Faculty Attendance
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Set up your account</h1>
        <p className="text-sm text-muted-foreground">
          Choose a password to finish accepting your staff invitation.
        </p>
      </div>
      <InviteAcceptanceForm />
    </main>
  );
}
