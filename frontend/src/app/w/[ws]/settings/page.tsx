"use client";

import { Download, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, Card, CardHeader, Field, Input, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

type Member = { user_id: string; name: string; email: string; role: string };

export default function SettingsPage() {
  const { workspace } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const base = `/workspaces/${workspace.id}`;
  const members = useApi<Member[]>(`${base}/members`);
  const isOwner = workspace.role === "owner";
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader title="Members" description="Members can see everything in this workspace. Contact details are owner-only." />
        {members.error && <div className="p-4"><Notice tone="bad">{members.error.message} <Button size="sm" variant="secondary" onClick={() => members.reload()}>Retry members</Button></Notice></div>}
        <ul className="divide-y divide-line">
          {members.data?.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere]"><span className="font-medium">{m.name}</span> <span className="text-ink-3">{m.email}</span></span>
              <div className="flex shrink-0 items-center gap-2"><Badge tone={m.role === "owner" ? "trail" : "neutral"}>{m.role}</Badge>
                {isOwner && m.role !== "owner" && <Button size="sm" variant="ghost" loading={removeMember.pending} onClick={() => removeMember.run(m)}>Remove member</Button>}
              </div>
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void invite.run(); }} className="flex flex-col items-stretch gap-3 border-t border-line p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><Field label="Add an existing Pursuit user by email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field></div>
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
