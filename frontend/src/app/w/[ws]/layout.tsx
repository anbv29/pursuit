import { Suspense } from "react";
import { WorkspaceClient } from "./workspace-client";

// Route params are only known at request time, so the client shell streams in
// behind a Suspense boundary (required by Cache Components).
export default function WorkspaceLayout({ children }: LayoutProps<"/w/[ws]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" aria-busy />}>
      <WorkspaceClient>{children}</WorkspaceClient>
    </Suspense>
  );
}
