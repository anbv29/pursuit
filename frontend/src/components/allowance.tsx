"use client";
import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { useWorkspace } from "./shell";
import { Notice } from "./ui";

export function ResearchAllowance() {
  const { workspace, base } = useWorkspace();
  const balance = useApi<{ research_remaining: number; questions_remaining: number }>(`/workspaces/${workspace.id}/allowance`);
  if (balance.error) return <Notice tone="bad">Could not load your allowance. You can retry this page; nothing has been charged.</Notice>;
  if (!balance.data) return <p className="text-sm text-ink-3">Checking research credits…</p>;
  return <div className="space-y-2 rounded-lg bg-trail-soft p-4 text-sm text-trail-strong">
    <p><b>{balance.data.research_remaining} research credits remaining.</b> A completed report uses one credit. Failed jobs return the customer credit.</p>
    <p>Included research uses Haiku 5.5. There are no automatic overage charges.</p>
    {workspace.role === "owner" ? <Link href={`${base}/billing`} className="inline-block font-medium underline">View plans and billing</Link> : <p>Ask your workspace owner to purchase more credits.</p>}
  </div>;
}
