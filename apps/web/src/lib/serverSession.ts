import { cookies } from "next/headers";
import { parseDemoSession, type DemoSession } from "@/lib/demoSession";

export async function getDemoSession(): Promise<DemoSession | null> {
  const store = await cookies();
  const raw = store.get("demo_session")?.value;
  return parseDemoSession(raw);
}

