"use client";

import { ChevronsLeft, ChevronsRight, FileText, Inbox, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { useApi } from "@/lib/hooks";
import type { Workspace } from "@/lib/types";
import { Logo } from "./brand";
import { useSession } from "./session";
import { Badge, cx, DemoBadge, Empty, Skeleton } from "./ui";

// Sidebar preference lives in localStorage; read it as an external store (SSR renders expanded).
const SIDEBAR_KEY = "pursuit.sidebar";
const readSidebar = () => localStorage.getItem(SIDEBAR_KEY) === "1";
const subscribeSidebar = (cb: () => void) => {
  window.addEventListener(SIDEBAR_KEY, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SIDEBAR_KEY, cb);
    window.removeEventListener("storage", cb);
  };
};

type WsCtx ={ workspace: Workspace; base: string; refreshApprovals: () => void };
const WorkspaceCtx = createContext<WsCtx | null>(null);
export function useWorkspace() {
  const c = useContext(WorkspaceCtx);
  if (!c) throw new Error("useWorkspace outside WorkspaceShell");
  return c;
}

export function WorkspaceShell({ wsId, children }: { wsId: string; children: ReactNode }) {
  const ws = useApi<Workspace>(`/workspaces/${wsId}`);
  const all = useApi<Workspace[]>("/workspaces");
  const approvals = useApi<unknown[]>(`/workspaces/${wsId}/approvals`);
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const base = `/w/${wsId}`;
  const toggle = () => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(SIDEBAR_KEY));
  };

  if (ws.error) {
    return (
      <div className="mx-auto mt-24 max-w-md">
        <Empty title="Workspace not available" body="It may not exist, or you don't have access to it."
          action={<Link className="text-sm font-medium text-trail" href="/w">Choose another workspace</Link>} />
      </div>
    );
  }

  const nav = [
    { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: `${base}/reports`, label: "Company reports", icon: FileText },
    { href: `${base}/experiments/new`, label: "New experiment", icon: Plus },
    { href: `${base}/approvals`, label: "Approvals", icon: Inbox, count: approvals.data?.length },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className={cx("sticky top-0 hidden h-screen print:hidden shrink-0 flex-col border-r border-line bg-surface/70 transition-[width] md:flex", collapsed ? "w-16" : "w-60")}>
        <div className={cx("flex h-14 items-center border-b border-line", collapsed ? "justify-center" : "px-4")}>
          <Logo href={base} compact={collapsed} />
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-0.5 p-2">
          {nav.map(({ href, label, icon: Icon, exact, count }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined}
                className={cx("flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                  active ? "bg-trail-soft font-medium text-trail-strong" : "text-ink-2 hover:bg-sunken hover:text-ink",
                  collapsed && "justify-center")}>
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && !!count && <span className="rounded-full bg-flag px-1.5 text-[11px] font-semibold text-white">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-2">
          <button onClick={toggle} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm text-ink-3 hover:bg-sunken" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> <span>Collapse</span></>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 print:hidden items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur md:px-6">
          <div className="md:hidden"><Logo href={base} compact /></div>
          {ws.data ? (
            <select aria-label="Switch workspace" value={wsId} onChange={(e) => router.push(e.target.value === "new" ? "/onboarding" : `/w/${e.target.value}`)}
              className="h-8 max-w-[14rem] truncate rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium hover:border-line focus:border-trail">
              {(all.data ?? [ws.data]).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              <option value="new">+ New workspace…</option>
            </select>
          ) : <Skeleton className="h-5 w-32" />}
          {ws.data?.is_demo ? <DemoBadge label="Demo workspace" /> : ws.data && <Badge tone="trail">Live workspace</Badge>}
          <nav aria-label="Mobile" className="ml-2 flex gap-1 md:hidden">
            {nav.slice(1, 4).map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} aria-label={label} className="rounded-lg p-2 text-ink-2 hover:bg-sunken"><Icon className="size-4" /></Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-ink-3 sm:inline">{user?.name}</span>
            <button onClick={async () => { await logout(); router.replace("/login"); }} aria-label="Sign out"
              className="rounded-lg p-2 text-ink-3 hover:bg-sunken hover:text-ink"><LogOut className="size-4" /></button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          {ws.data ? (
            <WorkspaceCtx.Provider value={{ workspace: ws.data, base, refreshApprovals: approvals.reload }}>
              {children}
            </WorkspaceCtx.Provider>
          ) : (
            <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>
          )}
        </main>
      </div>
    </div>
  );
}
