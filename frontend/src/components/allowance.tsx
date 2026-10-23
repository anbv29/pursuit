import { Sparkles } from "lucide-react";

export function ResearchAllowance() {
  return <aside aria-label="Free workspace access" className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
    <Sparkles aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-trail" />
    <div>
      <p className="text-sm font-semibold text-ink">Your whole workspace is free</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">Create full reports, ask follow-up questions and run experiments without a subscription.</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">One report runs at a time per workspace. Fair-use and provider capacity limits apply.</p>
    </div>
  </aside>;
}
