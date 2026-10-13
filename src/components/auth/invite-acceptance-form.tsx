"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type InviteStatus = "checking" | "ready" | "invalid" | "complete";

export function InviteAcceptanceForm() {
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkInvite() {
      try {
        // The Supabase browser client reads and exchanges the invite tokens in
        // the URL fragment, then persists the resulting session in the browser.
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!active) return;

        // Remove auth parameters even when the invitation is expired, so a
        // token or error description does not remain in the address bar.
        window.history.replaceState(null, "", window.location.pathname);

        if (sessionError || !data.session) {
          setStatus("invalid");
          return;
        }

        setEmail(data.session.user.email ?? null);
        setStatus("ready");
      } catch {
        if (active) setStatus("invalid");
      }
    }

    void checkInvite();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm-password") ?? "");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      setPending(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("We couldn’t save that password. The invite may have expired; ask the office to send a new one.");
        return;
      }

      setStatus("complete");
      router.replace("/");
      router.refresh();
    } catch {
      setError("We couldn’t connect to the account service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        {status === "checking" && (
          <p className="text-sm text-muted-foreground" role="status">Checking your invitation…</p>
        )}

        {status === "invalid" && (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">
              This invitation is invalid or expired. Ask the office to send you a new invitation.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Return to sign in
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Creating an account for <span className="font-medium text-foreground">{email ?? "your invited email"}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving password…" : "Set password"}
            </Button>
          </form>
        )}

        {status === "complete" && (
          <p className="text-sm text-muted-foreground" role="status">Password saved. Opening your account…</p>
        )}
      </CardContent>
    </Card>
  );
}
