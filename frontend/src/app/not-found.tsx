import Link from "next/link";
import { SystemCard } from "@/components/system-card";
import { buttonStyles } from "@/components/ui";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <SystemCard code="404" title="This page isn't here" body="The link may be old, or the page may have moved.">
      <Link href="/" className={buttonStyles("primary")}>Go to the home page</Link>
      <Link href="/w" className={buttonStyles("secondary")}>Open your workspace</Link>
    </SystemCard>
  );
}
