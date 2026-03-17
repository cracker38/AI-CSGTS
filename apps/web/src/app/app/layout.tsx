import { redirect } from "next/navigation";
import { getDemoSession } from "@/lib/serverSession";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getDemoSession();
  if (!session) redirect("/auth/login");
  if (session.status !== "ACTIVE") redirect("/auth/pending");

  return (
    <AppShell session={session}>{children}</AppShell>
  );
}

