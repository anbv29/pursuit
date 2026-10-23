import { redirect } from "next/navigation";

export default async function FormerBillingPage({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  redirect(`/w/${ws}`);
}
