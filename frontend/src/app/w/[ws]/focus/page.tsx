"use client";

import { FounderFocusCard, RemindersPanel } from "@/components/founder-focus";
import { PageHeader } from "@/components/ui";
import { useState } from "react";

export default function FocusPage() {
  const [version, setVersion] = useState(0);
  return <div className="space-y-6">
    <PageHeader title="Your priorities" description="A practical next step, a reason to do it, and a place to keep your follow-ups." />
    <FounderFocusCard refreshKey={version} />
    <section id="reminders" className="scroll-mt-28"><RemindersPanel onChange={() => setVersion(v => v + 1)} /></section>
  </div>;
}
