"use client";

import {
  Bell, ChevronRight, ChevronsLeft, ChevronsRight, CreditCard, FileText, Inbox, LayoutDashboard, LogOut,
  MoreHorizontal, Moon, Plus, Search, Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useApi } from "@/lib/hooks";
import { errorMessage } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { Logo } from "./brand";
import { useFeedback } from "./feedback";
import { CommandPalette, type Command } from "./command-palette";
import { ReadingControls } from "./reading-mode";
import { RouteProgress } from "./route-progress";
import { useSession } from "./session";
import { setTheme, ThemeToggle, useTheme } from "./theme";
import { Avatar, Badge, cx, DemoBadge, Empty, Glass, Menu, Skeleton } from "./ui";

// Sidebar preference lives in localStorage; read it as an external store (SSR renders expanded).
const SIDEBAR_KEY = "pursuit.sidebar";
const readSidebar = () => { try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; } };
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

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; count?: number };

export function WorkspaceShell({ wsId, children }: { wsId: string; children: ReactNode }) {
  const ws = useApi<Workspace>(`/workspaces/${wsId}`);
  const all = useApi<Workspace[]>("/workspaces");
  const approvals = useApi<unknown[]>(`/workspaces/${wsId}/approvals`);
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const { toast } = useFeedback();
  const theme = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const base = `/w/${wsId}`;
  const toggle = () => {
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? "0" : "1"); }
    catch { toast("error", "Your browser could not save this preference."); return; }
    window.dispatchEvent(new Event(SIDEBAR_KEY));
  };
  const signOut = async () => {
    try { await logout(); router.replace("/login"); }
    catch (e) { toast("error", errorMessage(e)); }
  };

  const nav: NavItem[] = [
    { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: `${base}/reports`, label: "Company reports", icon: FileText },
    { href: `${base}/experiments/new`, label: "New experiment", icon: Plus },
    { href: `${base}/approvals`, label: "Approvals", icon: Inbox, count: approvals.data?.length },
    ...(ws.data?.role === "owner" ? [{ href: `${base}/billing`, label: "Plans & billing", icon: CreditCard }] : []),
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];
  const isActive = (n: NavItem) => (n.exact ? path === n.href : path.startsWith(n.href));
  const current = nav.find(isActive);

  // Breadcrumbs only below two levels (a single report or experiment).
  const crumbs = path.match(/\/reports\/(?!new$)[^/]+$/) ? [{ href: `${base}/reports`, label: "Company reports" }, { label: "Report" }]
    : path.match(/\/experiments\/(?!new$)[^/]+$/) ? [{ href: base, label: "Dashboard" }, { label: "Experiment" }]
      : path.endsWith("/reports/new") ? [{ href: `${base}/reports`, label: "Company reports" }, { label: "New report" }]
        : null;

  const commands = useMemo<Command[]>(() => [
    ...nav.map((n) => ({ id: n.href, label: n.label, hint: "Go to", href: n.href, icon: <n.icon className="size-3.5" /> })),
    { id: "new-report", label: "Analyze a company", hint: "New report", href: `${base}/reports/new`, icon: <FileText className="size-3.5" /> },
    { id: "theme", label: theme === "dark" ? "Use light theme" : "Use dark theme", run: () => setTheme(theme === "dark" ? "light" : "dark"), icon: <Moon className="size-3.5" /> },
    { id: "signout", label: "Sign out", run: () => void signOut(), icon: <LogOut className="size-3.5" /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [base, theme, ws.data?.role, approvals.data?.length]);

  if (ws.error) {
    return (
      <div className="mx-auto mt-24 max-w-md px-4">
        <Glass className="p-2">
          <Empty title="Workspace not available" body="It may not exist, or you don't have access to it."
            action={<Link className="text-sm font-semibold text-trail hover:underline" href="/w">Choose another workspace</Link>} />
        </Glass>
      </div>
    );
  }

  const switcher = ws.data ? (
    <select aria-label="Switch workspace" value={wsId} onChange={(e) => router.push(e.target.value === "new" ? "/onboarding" : `/w/${e.target.value}`)}
      className="h-9 w-full min-w-0 truncate rounded-xl border border-line bg-surface/80 px-2.5 text-sm font-medium text-ink hover:border-line-strong focus:border-accent">
      {(all.data ?? [ws.data]).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      <option value="new">+ New workspace…</option>
    </select>
  ) : <Skeleton className="h-9 w-full" />;

  const mobilePrimary = nav.slice(0, 4);
  const mobileMore = nav.slice(4);

  return (
    <div className="app-shell flex min-h-screen">
      <RouteProgress />
      <CommandPalette commands={commands} open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Desktop sidebar */}
      <aside className={cx("sticky top-0 hidden h-screen shrink-0 p-3 print:hidden md:block transition-[width] duration-300 ease-[var(--ease-out)]", collapsed ? "w-[88px]" : "w-[264px]")}>
        <Glass as="nav" aria-label="Primary" className="flex h-full flex-col p-3">
          <div className={cx("flex h-11 items-center", collapsed ? "justify-center" : "px-1.5")}>
            <Logo href={base} compact={collapsed} />
          </div>
          {!collapsed && <div className="mt-3">{switcher}</div>}
          <ul className="mt-4 flex-1 space-y-1">
            {nav.map((n) => {
              const active = isActive(n);
              return (
                <li key={n.href}>
                  <Link href={n.href} title={collapsed ? n.label : undefined} aria-current={active ? "page" : undefined}
                    className={cx("press relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-[background-color,color] duration-150",
                      active ? "bg-surface font-semibold text-ink shadow-[0_4px_14px_-8px_var(--shadow)] ring-1 ring-[var(--glass-border)]" : "text-ink-2 hover:bg-[var(--inset)] hover:text-ink",
                      collapsed && "justify-center px-0")}>
                    {active && <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-accent" aria-hidden />}
                    <n.icon className="size-[18px] shrink-0" aria-hidden />
                    {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
                    {!!n.count && (
                      <span className={cx("rounded-full bg-warning px-1.5 text-[11px] font-bold leading-5 text-bg", collapsed && "absolute right-1.5 top-1")}>
                        {n.count}<span className="sr-only"> waiting</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button onClick={toggle} className="press flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm text-ink-3 hover:bg-[var(--inset)] hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> <span>Collapse</span></>}
          </button>
        </Glass>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-3 pt-3 print:hidden md:pl-0">
          <Glass as="div" className="flex h-14 items-center gap-2 rounded-[20px] px-3 md:px-4">
            <div className="md:hidden"><Logo href={base} compact /></div>
            <div className="min-w-0 flex-1">
              {crumbs ? (
                <nav aria-label="Breadcrumb">
                  <ol className="flex min-w-0 items-center gap-1 text-sm">
                    {crumbs.map((c, i) => (
                      <li key={i} className="flex min-w-0 items-center gap-1">
                        {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />}
                        {"href" in c && c.href
                          ? <Link href={c.href} className="truncate text-ink-3 hover:text-ink">{c.label}</Link>
                          : <span aria-current="page" className="truncate font-semibold text-ink">{c.label}</span>}
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : (
                <p className="truncate font-ui text-[14px] font-semibold text-ink">{current?.label ?? "Pursuit"}</p>
              )}
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              {ws.data?.is_demo ? <DemoBadge label="Demo workspace" /> : ws.data && <Badge tone="trail">Live workspace</Badge>}
            </div>
            <button type="button" onClick={() => setPaletteOpen(true)}
              className="press hidden h-9 items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 text-sm text-ink-3 hover:text-ink sm:flex"
              aria-label="Open command palette" aria-keyshortcuts="Control+K Meta+K">
              <Search className="size-4" aria-hidden /> <span>Search</span>
              <kbd className="ml-2 rounded-md border border-line px-1.5 text-[11px]">Ctrl K</kbd>
            </button>
            <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"
              className="press grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-[var(--inset)] sm:hidden"><Search className="size-[18px]" /></button>
            <Link href={`${base}/approvals`} aria-label={`Approvals${approvals.data?.length ? `, ${approvals.data.length} waiting` : ""}`}
              className="press relative grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-[var(--inset)] hover:text-ink">
              <Bell className="size-[18px]" aria-hidden />
              {!!approvals.data?.length && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-warning ring-2 ring-[var(--surface-solid)]" />}
            </Link>
            <ThemeToggle />
            <Menu label="Account" items={[{ label: "Account security", onSelect: () => router.push("/account"), icon: <Settings className="size-4" /> },
              { label: "Settings", onSelect: () => router.push(`${base}/settings`), icon: <Settings className="size-4" /> },
              { label: "Sign out", onSelect: () => void signOut(), icon: <LogOut className="size-4" />, danger: true }]}
              trigger={({ open, toggle: t, id }) => (
                <button type="button" onClick={t} aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label="Account menu"
                  className="press flex items-center gap-2 rounded-xl p-1 pr-1.5 hover:bg-[var(--inset)] sm:pr-2.5">
                  <Avatar name={user?.name ?? "?"} />
                  <span className="hidden max-w-[9rem] truncate text-sm font-medium text-ink sm:inline">{user?.name}</span>
                </button>
              )} />
          </Glass>
          <div className="mt-2 md:hidden">{switcher}</div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          {ws.data ? (
            <WorkspaceCtx.Provider value={{ workspace: ws.data, base, refreshApprovals: approvals.reload }}>
              <ReadingControls />
              {children}
            </WorkspaceCtx.Provider>
          ) : (
            <div className="mx-auto max-w-6xl space-y-4" aria-busy>
              <Skeleton className="h-9 w-64" /><Skeleton className="h-4 w-96 max-w-full" />
              <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-56 lg:col-span-2" /><Skeleton className="h-56" /></div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-30 print:hidden md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Glass className="flex items-stretch justify-around rounded-[22px] p-1.5">
          {mobilePrimary.map((n) => {
            const active = isActive(n);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={cx("press relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px]",
                  active ? "bg-surface font-semibold text-ink" : "text-ink-3")}>
                <n.icon className="size-5" aria-hidden />
                <span className="w-full truncate text-center">{n.label.replace("Company reports", "Reports").replace("New experiment", "New")}</span>
                {!!n.count && <span className="absolute right-3 top-1 size-2 rounded-full bg-warning" aria-hidden />}
              </Link>
            );
          })}
          {mobileMore.length > 0 && (
            <Menu label="More pages" align="end" items={mobileMore.map((n) => ({ label: n.label, onSelect: () => router.push(n.href), icon: <n.icon className="size-4" /> }))}
              trigger={({ open, toggle: t, id }) => (
                <button type="button" onClick={t} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
                  className={cx("press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px]",
                    mobileMore.some(isActive) ? "bg-surface font-semibold text-ink" : "text-ink-3")}>
                  <MoreHorizontal className="size-5" aria-hidden /> More
                </button>
              )} />
          )}
        </Glass>
      </nav>
    </div>
  );
}
