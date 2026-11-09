import { z } from "zod";

export const watchAlertSchema = z.object({
  id: z.string(), report_id: z.string(), company_name: z.string(),
  kind: z.enum(["changed", "unverifiable", "contradicted"]),
  claim_text: z.string(), source_url: z.string(), source_title: z.string(),
  previous_excerpt: z.string(), current_excerpt: z.string(),
  checked_at: z.string(), acknowledged_at: z.string().nullable(), section: z.string(),
});
export const watchSchema = z.object({
  enabled: z.boolean(), checking: z.boolean(),
  last_checked_at: z.string().nullable(), next_check_at: z.string().nullable(),
  claim_ids: z.array(z.string()), alerts: z.array(watchAlertSchema),
  claims: z.array(z.object({ id: z.string(), text: z.string(), source_ids: z.array(z.string()), section: z.string() })),
});
export type WatchAlert = z.infer<typeof watchAlertSchema>;
export const watchAlertLabels = {
  changed: "Evidence changed, review the claim",
  unverifiable: "Source could not be verified",
  contradicted: "New evidence contradicts this claim",
};
