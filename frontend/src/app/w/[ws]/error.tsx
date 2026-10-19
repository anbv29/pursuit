"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { Button, buttonStyles, Empty, Glass } from "@/components/ui";

/** Errors inside a workspace page keep the shell (sidebar, top bar) usable. */
export default function WorkspaceError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Glass className="mx-auto mt-6 max-w-lg p-2">
      <Empty icon={<AlertTriangle className="size-5" />} title="This page hit a problem"
        body="Something unexpected went wrong while showing this page. Your data is safe."
        action={<div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}><RotateCw className="size-4" aria-hidden /> Try again</Button>
          <Link href="/w" className={buttonStyles("secondary")}>Back to dashboard</Link>
        </div>} />
    </Glass>
  );
}
