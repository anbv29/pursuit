"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { useWorkspace } from "./shell";
import { Badge, Button, Card, Empty, Notice, Skeleton } from "./ui";

type Plan = { id: string; name: string; price_cents: number; interval: string; reports: number; questions: number; seats: number };
type Billing = { plan: string; seats: number; seats_used: number; research_remaining: number; questions_remaining: number;
  configured: boolean; provider_connected?: boolean; environment: string; status: string; period_end: string | null; cancel_at_period_end: boolean;
  suspended: boolean; portal_available: boolean; purchasable: Record<string, boolean>;
  complimentary?: boolean; allowance_resets_at?: string | null;
  orders: { id: string; plan: string; status: string; created_at: string }[] };

export function BillingPanel() {
  const { workspace } = useWorkspace();
  const owner = workspace.role === "owner";
  const path = `/workspaces/${workspace.id}/billing`;
  const summary = useApi<Billing>(owner ? path : null);
  const plans = useApi<Plan[]>("/plans");
  const router = useRouter(), pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState("");
  const change = useAction(async (plan?: string) => {
    setError(null); setPurchase(plan ?? "portal");
    try {
      const result = await api<{ url: string }>(`${path}/${plan ? "checkout" : "portal"}`, { method: "POST", ...(plan ? { json: { plan } } : {}) });
      window.location.assign(result.url);
    } catch (e) { setError(errorMessage(e)); }
  });
  useEffect(() => {
    // Return parameters are not payment proof; drop personal query data from the URL.
    if (window.location.search) router.replace(pathname);
  }, [pathname, router]);
  const pending = summary.data?.orders?.some((o) => ["CREATING", "OPEN"].includes(o.status));
  const { reload } = summary;
  useEffect(() => {
    if (!pending) return;
    let checks = 0;
    const timer = setInterval(() => { void reload(); if (++checks >= 12) clearInterval(timer); }, 10000);
    return () => clearInterval(timer);
  }, [pending, reload]);
  if (!owner) return <Empty title="Billing is managed by your workspace owner" body="Ask the owner to purchase credits or manage the team subscription." />;
  if (summary.error || plans.error) return <Empty title="Billing could not be loaded" body={summary.error?.message ?? plans.error?.message ?? "Try again."} action={<Button onClick={() => { void summary.reload(); void plans.reload(); }}>Retry billing</Button>} />;
  if (!summary.data || !plans.data) return <Skeleton className="h-64" />;
  const b = summary.data;
  const subscription = ["active", "past_due", "on_hold", "paused", "pending"].includes(b.status);
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Plans & billing</h1><p className="mt-2 text-sm text-ink-2">Research when you need it. Keep your evidence and manual experiments on every plan.</p></div>
      <Badge tone={b.environment === "test_mode" ? "demo" : "trail"}>{b.environment === "test_mode" ? "Test payments" : "Live payments"}</Badge>
    </div>
    {!b.configured && <Notice>{b.provider_connected ? "Billing is connected. Checkout is paused until launch configuration is complete. No payment will be taken."
      : "Payments are not configured yet. You can compare plans, but checkout is unavailable and no payment will be taken."}</Notice>}
    {workspace.is_demo && <Notice tone="demo">This is a demo workspace. Create a company workspace before buying a plan.</Notice>}
    {b.suspended && <Notice tone="bad">Paid access is paused for payment review. Contact support; your saved data remains accessible.</Notice>}
    {b.complimentary && <Notice tone="trail">Complimentary {b.plan === "team" ? "Team" : "Founder"} access is active. No subscription was purchased and no recurring charge is scheduled.
      {b.allowance_resets_at && <> Your included allowances reset on {new Date(b.allowance_resets_at).toLocaleDateString()} (UTC calendar month).</>}
      {b.portal_available && <> Any separately purchased subscription still needs to be managed in billing.</>}
    </Notice>}
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Your workspace allowance</h2><span className="text-sm capitalize">{b.plan === "free" ? "Explore" : b.plan} · {b.complimentary ? "Complimentary" : b.status}</span></div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {[ ["Research credits", b.research_remaining], ["AI answers", b.questions_remaining], ["Members", `${b.seats_used}/${b.seats}`] ].map(([label, value]) => <div key={label}><dt className="text-ink-3">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      {b.period_end && <p className="text-sm text-ink-3">{b.cancel_at_period_end ? "Scheduled to end" : "Current period ends"}: {new Date(b.period_end).toLocaleString()}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => summary.reload()} loading={summary.loading}>Refresh payment status</Button>
        {b.portal_available && <Button size="sm" loading={change.pending && purchase === "portal"} disabled={change.pending} onClick={() => change.run()}>Manage billing & cancellation</Button>}</div>
      {pending && <p className="text-sm text-ink-2">Checkout is open or payment confirmation is pending. Access changes only after a verified payment notification.</p>}
    </Card>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {plans.data.map((p) => <Card key={p.id} className="flex flex-col p-5">
        <h2 className="font-semibold">{p.name}</h2><p className="mt-3 text-3xl font-semibold">${p.price_cents / 100}<span className="text-sm font-normal text-ink-3">{p.interval === "month" ? "/month" : p.interval === "once" ? " once" : ""}</span></p>
        <ul className="my-5 flex-1 space-y-2 text-sm text-ink-2">
          <li>{p.reports ? `${p.reports} research credit${p.reports === 1 ? "" : "s"}` : "Sample report and manual experiments"}</li>
          <li>{p.questions ? `${p.questions} AI answers` : "Free rule-based recommendations"}</li>
          <li>{p.seats} member{p.seats === 1 ? "" : "s"}, including the owner</li>
          {["founder", "team"].includes(p.id) && <><li>Selective refresh and company discovery</li><li>Share links and report history</li></>}
          {p.id === "single" && <li>Full report, first-week plan and PDF export</li>}
          <li>All six experiment workflows</li>
        </ul>
        {p.id === "free" ? <p className="text-sm text-ink-3">Always available</p> : <Button variant={p.id === "founder" ? "primary" : "secondary"} loading={change.pending && purchase === p.id}
          disabled={change.pending || !b.purchasable[p.id] || workspace.is_demo || b.suspended || (p.id !== "single" && subscription)} onClick={() => change.run(p.id)}>{p.id === "single" ? "Buy one report" : `Choose ${p.name}`}</Button>}
      </Card>)}
    </div>
    {subscription && <p className="text-sm text-ink-2">Use Manage billing to change or cancel your existing subscription. A second subscription cannot be started here.</p>}
    <div className="space-y-2 text-sm text-ink-2">
      <p>One research credit covers one full report, selected-section refresh, or company discovery search—even if no matching companies are found. Refresh and discovery need Founder or Team.</p>
      <p>One AI answer covers a report question or optional AI-assisted experiment recommendation. First-week checklists and rule-based analysis use no credits.</p>
      <p>Prices are USD, per workspace, plus applicable taxes shown at checkout. Monthly plans renew automatically; unused monthly allowances expire at period end. Single Report credits do not expire. No automatic overage charges.</p>
      <p>Failed jobs release their customer credit. Included AI has resource and cost safety limits. Fo and email-provider charges are separate; live action execution is not included in these prices.</p>
    </div>
    {error && <Notice tone="bad">{error}</Notice>}
    {b.orders.length > 0 && <section><h2 className="mb-3 font-semibold">Recent checkout activity</h2><ul className="divide-y divide-line text-sm">{b.orders.map((o) => <li key={o.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="capitalize">{o.plan}</span><span>{o.status} · {new Date(o.created_at).toLocaleString()}</span></li>)}</ul><p className="mt-2 text-xs text-ink-3">Use the billing portal for provider invoices and payment methods. An open checkout is not a completed purchase.</p></section>}
  </div>;
}
