import { Skeleton } from "@/components/ui";

export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy aria-label="Loading">
      <div className="space-y-3 border-b border-line pb-6"><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="space-y-5 rounded-xl border border-line bg-surface p-5 sm:p-8"><Skeleton className="h-8 w-80 max-w-full" /><Skeleton className="h-4 w-full max-w-lg" /><Skeleton className="h-11 w-48 max-w-full" /></div>
      <div className="divide-y divide-line border-y border-line">{[0, 1, 2].map((i) => <div key={i} className="space-y-3 py-6"><Skeleton className="h-5 w-64 max-w-full" /><Skeleton className="h-3 w-80 max-w-full" /></div>)}</div>
    </div>
  );
}
