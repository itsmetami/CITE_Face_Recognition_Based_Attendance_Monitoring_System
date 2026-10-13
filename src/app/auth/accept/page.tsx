import { InviteAcceptanceForm } from "@/components/auth/invite-acceptance-form";
import { CiteBrand } from "@/components/brand/cite-brand";

export default function AcceptInvitePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      <div className="mb-8 flex justify-center"><CiteBrand /></div>
      <div className="mb-7 space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#37754a] dark:text-[#91cf9b]">Staff invitation</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Set up your account</h1>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
          Choose a password to finish accepting your staff invitation.
        </p>
      </div>
      <InviteAcceptanceForm />
    </main>
  );
}
