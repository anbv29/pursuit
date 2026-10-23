"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { useFeedback } from "@/components/feedback";
import { RequireAuth, useSession } from "@/components/session";
import { Button, Field, Glass, Input, PasswordInput } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

function AccountSecurity() {
  const { user, logout } = useSession();
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent, deleting: boolean) {
    e.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      if (deleting && !await confirm({ title: "Permanently delete your account?", body: "This removes your sign-in and memberships. Shared workspace records stay with their workspace. You must delete owned workspaces first.", confirm: "Delete account", danger: true })) return;
      await api(deleting ? "/account" : "/account/password", { method: deleting ? "DELETE" : "POST", json: deleting
        ? { current_password: current, confirmation }
        : { current_password: current, new_password: password } });
      await logout();
      toast("success", deleting ? "Your account was deleted." : "Password changed. Sign in again on each device.");
      router.replace("/login");
    } catch (err) { setError(errorMessage(err)); }
    finally { setPending(false); }
  }

  return <>
    <LandingNav />
    <main className="mx-auto max-w-xl space-y-6 px-4 py-12">
      <div><Link href="/w" className="text-sm text-trail hover:underline">Back to workspace</Link>
        <h1 className="mt-4 font-display text-3xl font-bold">Account security</h1>
        <p className="mt-2 break-words text-ink-3">Signed in as {user?.email}</p></div>
      <Glass className="space-y-5 p-6">
        <h2 className="font-display text-xl font-bold">Change your password</h2>
        <p className="text-sm text-ink-3">Use at least 8 characters. Changing your password signs out every device.</p>
        <form onSubmit={(e) => void submit(e, false)} className="space-y-4">
          <Field label="Current password">{(id) => <PasswordInput id={id} required autoComplete="current-password" maxLength={200} value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
          <Field label="New password">{(id) => <PasswordInput id={id} required autoComplete="new-password" minLength={8} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <Button type="submit" disabled={pending}>{pending ? "Working…" : "Change password"}</Button>
        </form>
      </Glass>
      <Glass className="space-y-5 p-6">
        <h2 className="font-display text-xl font-bold">Delete your account</h2>
        <p className="text-sm text-ink-3">First export and delete workspaces you own in workspace settings. Any historical subscription must be cancelled with its provider before workspace deletion. Records belonging to shared workspaces are retained there.</p>
        <form onSubmit={(e) => void submit(e, true)} className="space-y-4">
          <Field label="Confirm current password">{(id) => <PasswordInput id={id} required autoComplete="current-password" value={current} maxLength={200} onChange={(e) => setCurrent(e.target.value)} />}</Field>
          <Field label="Type DELETE MY ACCOUNT">{(id) => <Input id={id} required pattern="DELETE MY ACCOUNT" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />}</Field>
          <Button type="submit" variant="danger" disabled={pending || confirmation !== "DELETE MY ACCOUNT"}>Delete account</Button>
        </form>
      </Glass>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </main>
  </>;
}

export default function AccountPage() {
  return <RequireAuth><AccountSecurity /></RequireAuth>;
}
