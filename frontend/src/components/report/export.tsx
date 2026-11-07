"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/lib/hooks";
import { Button, Notice } from "../ui";

export function ReportExport({ path }: { path: string }) {
  const [error, setError] = useState<string | null>(null);
  const download = useAction(async (extension: "pdf" | "md") => {
    setError(null);
    try {
      const response = await fetch(`/api${path}/export/${extension}`, {
        credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        setError(response.status === 404 ? "This report or share link is no longer available."
          : response.status === 401 ? "Sign in again to download this report."
            : response.status === 409 ? "Wait until this report finishes before exporting."
              : "Could not export this report. Please try again.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]
        ?? `pursuit-report.${extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not download this report. Check your connection and try again.");
    }
  });

  return <div className="max-w-sm space-y-2 print:hidden">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Export report">
      <Button variant="secondary" disabled={download.pending} onClick={() => void download.run("pdf")}>
        <Download className="size-4" aria-hidden /> Download PDF
      </Button>
      <Button variant="secondary" disabled={download.pending} onClick={() => void download.run("md")}>
        <Download className="size-4" aria-hidden /> Download Markdown
      </Button>
    </div>
    <p className="text-xs text-ink-3" role="status">{download.pending
      ? "Preparing your download…" : "Includes report findings, sources and uncertainty. Import the Markdown file into Notion. PDF uses Unicode escapes for unsupported characters."}</p>
    {error && <div role="alert"><Notice tone="bad">{error}</Notice></div>}
  </div>;
}
