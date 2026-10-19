"use client";

import { Bot, Download, PlugZap, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { UsagePanel } from "@/components/usage";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

type Integrations = {
  environment: string;
  fo: { mode: string; status: string; detail?: string; tools?: string[]; verified_live: boolean; workspace_forced_demo: boolean; account_connected: boolean; oauth_configured: boolean };
  ai: { enabled: boolean; model: string | null; detail: string | null };
  checked_at: string;
};
type Member = { user_id: string; name: string; email: string; role: string };

export default function SettingsPage() {
  const { workspace } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const base = `/workspaces/${workspace.id}`;
  const integ = useApi<Integrations>(`${base}/integrations`);
  const members = useApi<Member[]>(`${base}/members`);
  const isOwner = workspace.role === "owner";
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const connectFo = useAction(async () => {
    try {
      const result = await api<{ url: string }>(`${base}/fo/connect`, { method: "POST" });
      window.location.assign(result.url);
    } catch (e) { toast("error", errorMessage(e)); }
  });
  const disconnectFo = useAction(async () => {
    if (!await confirm({ title: "Disconnect your Fo account?", body: "Your approved actions will need reconnection before they can run. Other users keep their own connections.", confirm: "Disconnect" })) return;
    try { await api("/fo/connection", { method: "DELETE" }); await integ.reload(); }
    catch (e) { toast("error", errorMessage(e)); }
  });

  const invite = useAction(async () => {
    try {
      await api(`${base}/members`, { json: { email } });
      setEmail("");
      setErr(null);
      await members.reload();
      toast("success", "Member added.");
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  const removeMember = useAction(async (member: Member) => {
    if (!await confirm({ title: `Remove ${member.name}?`, body: "They will lose workspace access. Their existing evidence and recorded work stay saved.", confirm: "Remove member", danger: true })) return;
    try { await api(`${base}/members/${member.user_id}`, { method: "DELETE" }); await members.reload(); toast("success", "Member removed; their seat is now available."); }
    catch (e) { toast("error", errorMessage(e)); }
  });

  const exportData = useAction(async () => {
    try {
      const data = await api<unknown>(`${base}/export`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `pursuit-${workspace.name.replace(/\W+/g, "-")}.json` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast("error", errorMessage(e));
    }
  });

  const remove = useAction(async () => {
    const ok = await confirm({
      title: `Delete “${workspace.name}”?`, danger: true, confirm: "Delete permanently",
      body: "All experiments, evidence, prospects, actions and outcomes in this workspace are deleted for everyone. This can't be undone. Export first if you need a copy.",
    });
    if (!ok) return;
    try {
      await api(base, { method: "DELETE" });
      try { localStorage.removeItem("pursuit.lastWorkspace"); } catch { /* Workspace is already deleted. */ }
      router.replace("/w");
    } catch (e) {
      toast("error", errorMessage(e));
    }
  });

  const fo = integ.data?.fo;
  const foTone = fo?.status === "connected" ? "good" : fo?.mode === "demo" ? "demo" : "bad";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <UsagePanel path={base} owner={isOwner} />

      <Card>
        <CardHeader title="Integrations" description="Credentials live on the server only and are never shown here." action={<Button size="sm" variant="secondary" onClick={() => integ.reload()} loading={integ.loading}>Re-check</Button>} />
        {integ.error ? <div className="p-5"><Notice tone="bad">{integ.error.message} Use Re-check to retry.</Notice></div> : !integ.data ? <div className="p-5"><Skeleton className="h-24" /></div> : (
          <ul className="divide-y divide-line">
            <li className="flex items-start gap-3 px-5 py-4">
              <PlugZap className="mt-0.5 size-5 text-trail" aria-hidden />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">Fo (Wajo) — real-world actions</p>
                  <Badge tone={foTone}>{fo!.mode === "demo" ? "Demo mode" : fo!.status}</Badge>
                  {!fo!.verified_live && fo!.mode === "live" && <Badge tone="flag">Not yet verified end-to-end</Badge>}
                </div>
                <p className="mt-1 text-[13px] text-ink-3">
                  {fo!.workspace_forced_demo ? "This is a demo workspace, so every action is simulated regardless of server settings."
                    : fo!.mode === "demo" ? "The server runs Fo in demo mode (FO_MODE=demo). Approved actions are simulated and labelled; nothing is sent."
                      : fo!.detail ?? (fo!.tools ? `Tools available: ${fo!.tools.join(", ")}` : "")}
                </p>
                <p className="mt-1 text-xs text-ink-3">Scope used: ask_fo / get_fo_reply only, with one narrowly worded instruction per approved action.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={!fo?.oauth_configured} loading={connectFo.pending} onClick={() => connectFo.run()}>
                    {fo?.account_connected ? "Reconnect my Fo account" : "Connect my Fo account"}
                  </Button>
                  {fo?.account_connected && <Button size="sm" variant="secondary" loading={disconnectFo.pending} onClick={() => disconnectFo.run()}>Disconnect</Button>}
                </div>
                {!fo?.oauth_configured && <p className="mt-2 text-xs text-ink-3">Fo connection is unavailable in this environment. Simulated actions remain available.</p>}
                <p className="mt-2 text-xs text-ink-3">Sign in to your own Wajo account. Pursuit refreshes its access automatically; a revoked connection needs sign-in again.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 px-5 py-4">
              <Bot className="mt-0.5 size-5 text-trail" aria-hidden />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Claude — evidence synthesis</p>
                  <Badge tone={integ.data.ai.enabled ? "good" : "muted"}>{integ.data.ai.enabled ? "Enabled" : "Off"}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-ink-3">
                  {integ.data.ai.enabled ? `Model ${integ.data.ai.model}. Receives aggregate metrics and evidence claims only — no prospect contact details.` : integ.data.ai.detail}
                </p>
              </div>
            </li>
          </ul>
        )}
        {integ.data && <p className="border-t border-line px-5 py-2 text-xs text-ink-3">Environment: {integ.data.environment} · checked {new Date(integ.data.checked_at).toLocaleTimeString()}</p>}
      </Card>

      <Card>
        <CardHeader title="Members" description="Members can see everything in this workspace. Contact details are owner-only." />
        {members.error && <div className="p-4"><Notice tone="bad">{members.error.message} <Button size="sm" variant="secondary" onClick={() => members.reload()}>Retry members</Button></Notice></div>}
        <ul className="divide-y divide-line">
          {members.data?.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="min-w-0 break-words pr-3"><span className="font-medium">{m.name}</span> <span className="text-ink-3">{m.email}</span></span>
              <div className="flex shrink-0 items-center gap-2"><Badge tone={m.role === "owner" ? "trail" : "neutral"}>{m.role}</Badge>
                {isOwner && m.role !== "owner" && <Button size="sm" variant="ghost" loading={removeMember.pending} onClick={() => removeMember.run(m)}>Remove member</Button>}
              </div>
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void invite.run(); }} className="flex items-end gap-2 border-t border-line p-4">
            <div className="flex-1"><Field label="Add an existing Pursuit user by email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field></div>
            <Button type="submit" loading={invite.pending} disabled={!email}><UserPlus className="size-3.5" /> Add</Button>
          </form>
        )}
        {err && <div className="px-4 pb-4"><Notice tone="bad">{err}</Notice></div>}
      </Card>

      {isOwner && (
        <Card>
          <CardHeader title="Your data" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-sm text-ink-2">Download everything in this workspace as JSON.</p>
            <Button variant="secondary" loading={exportData.pending} onClick={() => exportData.run()}><Download className="size-3.5" /> Export</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-sm text-ink-2">Permanently delete this workspace and all its data.</p>
            <Button variant="danger" loading={remove.pending} onClick={() => remove.run()}><Trash2 className="size-3.5" /> Delete workspace</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
