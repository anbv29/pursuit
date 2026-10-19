import { Skeleton } from "@/components/ui";

/** Route-level loading state for workspace pages: shaped like a typical page. */
export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy aria-label="Loading">
      <div className="space-y-2"><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
    </div>
  );
}
