"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type StaffRole = "teacher" | "secretary";

type StaffAccount = {
  user_id: string;
  email: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
};

type AdminResponse = { staff?: StaffAccount[]; error?: string };

type DeanStaffPanelProps = {
  initialStaff: StaffAccount[];
  initialError: string | null;
};

async function callAdmin(body: Record<string, string>) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<AdminResponse>("admin-users", { body });

  if (error) throw new Error("The staff request failed. Check that the admin-users function is deployed, then try again.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function DeanStaffPanel({ initialStaff, initialError }: DeanStaffPanelProps) {
  const [staff, setStaff] = useState<StaffAccount[]>(initialStaff);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "list" });
      setStaff(data?.staff ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load staff accounts.");
    }
  }, []);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setError(null);
    setNotice(null);
    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      await callAdmin({
        action: "create",
        display_name: String(values.get("display_name") ?? "").trim(),
        email: String(values.get("email") ?? "").trim(),
        password: String(values.get("password") ?? ""),
        role: String(values.get("role") ?? "teacher"),
      });
      form.reset();
      setNotice("Staff account created.");
      await loadStaff();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the account.");
    } finally {
      setPending(null);
    }
  }

  async function updateStaff(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    setPending(userId);
    setError(null);
    setNotice(null);
    const values = new FormData(event.currentTarget);

    try {
      await callAdmin({
        action: "update",
        user_id: userId,
        display_name: String(values.get("display_name") ?? "").trim(),
        email: String(values.get("email") ?? "").trim(),
        role: String(values.get("role") ?? "teacher"),
      });
      setNotice("Staff account updated.");
      await loadStaff();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the account.");
    } finally {
      setPending(null);
    }
  }

  async function setActive(account: StaffAccount) {
    const action = account.is_active ? "deactivate" : "activate";
    setPending(account.user_id);
    setError(null);
    setNotice(null);

    try {
      await callAdmin({ action, user_id: account.user_id });
      setNotice(account.is_active ? "Account deactivated. Its attendance history is preserved." : "Account reactivated.");
      await loadStaff();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not change account status.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="dean-tools-title">
      <div>
        <h2 id="dean-tools-title" className="text-2xl font-semibold tracking-tight">Dean administration</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage teacher and secretary access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add staff account</CardTitle>
          <CardDescription>Create an individual login. Use a temporary password and share it privately.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createStaff} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-display-name">Display name</Label>
              <Input id="new-display-name" name="display_name" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Staff email</Label>
              <Input id="new-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <select id="new-role" name="role" defaultValue="teacher" className="h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm">
                <option value="teacher">Teacher</option>
                <option value="secretary">Secretary</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending !== null}>{pending === "create" ? "Creating…" : "Create staff account"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>Dean accounts are protected and can’t be edited or deactivated here. Deactivation preserves attendance history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="rounded-md border border-border p-3 text-sm">{notice}</p>}
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher or secretary accounts found.</p>
          ) : (
            <div className="space-y-4">
              {staff.map((account) => (
                <form key={account.user_id} onSubmit={(event) => updateStaff(event, account.user_id)} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${account.user_id}`}>Display name</Label>
                    <Input id={`name-${account.user_id}`} name="display_name" defaultValue={account.display_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${account.user_id}`}>Staff email</Label>
                    <Input id={`email-${account.user_id}`} name="email" type="email" defaultValue={account.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`role-${account.user_id}`}>Role</Label>
                    <select id={`role-${account.user_id}`} name="role" defaultValue={account.role} className="h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm">
                      <option value="teacher">Teacher</option>
                      <option value="secretary">Secretary</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Button type="submit" variant="outline" disabled={pending !== null}>{pending === account.user_id ? "Saving…" : "Save changes"}</Button>
                    <Button type="button" variant={account.is_active ? "destructive" : "secondary"} disabled={pending !== null} onClick={() => void setActive(account)}>
                      {account.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                    <span className="pb-2 text-xs text-muted-foreground">{account.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
