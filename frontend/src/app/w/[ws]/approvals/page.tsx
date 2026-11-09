"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/shell";
import { WatchAlerts } from "@/components/watch-alerts";
import { Badge, Card, CardHeader, DemoBadge, Empty, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { ACTION_STATUS, timeAgo } from "@/lib/labels";
import type { Action } from "@/lib/types";

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

  const queues = [
    { title: "Waiting for approval", description: "Requested actions that have not run.", list: pending },
    { title: "Assistant needs attention", description: "Review a question or interrupted task next to its experiment.", list: attention },
    { title: "Outcome unconfirmed", description: "Confirm what actually happened after the assistant responded.", list: unknown },
  ];
  const activeQueues = queues.filter(queue => queue.list.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Inbox" description="Report alerts and actions that need your review. Open an action to decide next to its evidence." />
      <WatchAlerts />
      <section aria-labelledby="action-queue-heading" className="space-y-4">
        <h2 id="action-queue-heading" className="text-lg font-semibold">Action queue</h2>
        {error ? <Empty title="Couldn't load approvals" body={error.message} />
          : loading && !data ? <Skeleton className="h-24" />
            : activeQueues.length === 0 ? <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-5">
              <Inbox className="mt-0.5 size-5 shrink-0 text-trail" aria-hidden />
              <div><h3 className="text-sm font-semibold">You&apos;re all caught up</h3><p className="mt-1 text-sm text-ink-2">No approvals, assistant questions or unconfirmed outcomes.</p></div>
            </div>
              : activeQueues.map(queue => <Card key={queue.title}>
                <CardHeader title={<span className="flex items-center gap-2">{queue.title}<Badge tone="trail">{queue.list.length}</Badge></span>} description={queue.description} />
                {items(queue.list)}
              </Card>)}
      </section>
    </div>
  );
}
