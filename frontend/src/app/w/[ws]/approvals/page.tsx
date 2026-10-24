"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/shell";
import { Badge, Card, CardHeader, DemoBadge, Empty, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { ACTION_STATUS, timeAgo } from "@/lib/labels";
import type { Action } from "@/lib/types";

/** Workspace-wide queue. Decisions happen in the experiment, next to its evidence. */
export default function ApprovalsPage() {
  const { workspace, base } = useWorkspace();
  const { data, loading, error } = useApi<Action[]>(`/workspaces/${workspace.id}/approvals`);
  const pending = data?.filter((a) => a.status === "PENDING_APPROVAL") ?? [];
  const attention = data?.filter((a) => a.status === "UNKNOWN" && a.fo_state === "needs_input") ?? [];
  const unknown = data?.filter((a) => a.status === "UNKNOWN" && a.fo_state !== "needs_input") ?? [];

  const items = (list: Action[]) => (
    <ul className="divide-y divide-line">
      {list.map((a) => (
        <li key={a.id}>
          <Link href={`${base}/experiments/${a.experiment_id}?tab=actions`} className="enter-rise flex flex-wrap items-center gap-2 px-5 py-3.5 transition-colors hover:bg-[var(--inset)]">
            <Badge tone={ACTION_STATUS[a.status].tone}>{ACTION_STATUS[a.status].label}</Badge>
            {a.mode === "demo" ? <DemoBadge label="Simulated" /> : <Badge tone="trail">Live · Fo</Badge>}
            <span className="text-sm font-medium">{a.kind.replace("_", " ")}</span>
            <span className="truncate text-sm text-ink-2">→ {a.target}</span>
            <span className="ml-auto text-xs text-ink-3">{timeAgo(a.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  const empty = (
    <Empty icon={<Inbox className="size-4" />} title="Nothing here" body="You're all caught up." />
  );

  const countChip = (n: number) => (
    <Badge tone={n > 0 ? "trail" : "muted"}>{n}</Badge>
  );

  const section = (title: string, description: string, list: Action[]) => (
    <>
      {/* Desktop: three stacked panels with counts in the headers */}
      <Card className="hidden sm:block">
        <CardHeader
          title={
            <span className="flex items-center gap-2">{title}{countChip(list.length)}</span>
          }
          description={description}
        />
        {list.length === 0 ? empty : items(list)}
      </Card>
      {/* Android: the same three panels as accordions with count chips */}
      <Card className="sm:hidden">
        <details open={list.length > 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-5 py-2">
            <span className="flex items-center gap-2 text-[15px] font-semibold">{title}{countChip(list.length)}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-ink-3 transition-transform [[open]>&]:rotate-180">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          {list.length === 0
            ? <div className="pb-10 pt-4 [&_div]:min-h-[50vh] [&_div]:flex [&_div]:items-center [&_div]:justify-center [&_div]:w-full">{empty}</div>
            : items(list)}
        </details>
      </Card>
    </>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-ink-3">Nothing leaves Pursuit without a human decision. Open an item to review it next to its experiment.</p>
      </div>
      {error ? <Empty title="Couldn't load approvals" body={error.message} />
        : loading && !data ? <Skeleton className="h-48" />
          : <>
            {section("Waiting for approval", "Requested actions that have not run.", pending)}
            {section("Fo needs attention", "Review a question or interrupted task and approve a clarification if needed.", attention)}
            {section("Outcome unconfirmed", "Fo responded, but nobody has confirmed what actually happened.", unknown)}
          </>}
    </div>
  );
}
