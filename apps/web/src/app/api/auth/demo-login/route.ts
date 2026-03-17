import { NextResponse } from "next/server";
import { encodeDemoSession, type DemoSession, type UserRole } from "@/lib/demoSession";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; role?: UserRole; fullName?: string }
    | null;

  const email = (body?.email ?? "").trim().toLowerCase();
  const fullName = (body?.fullName ?? "").trim() || "Demo User";
  const role = body?.role ?? "EMPLOYEE";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const session: DemoSession = { email, fullName, role, status: "ACTIVE" };
  const res = NextResponse.json({ ok: true });
  res.cookies.set("demo_session", encodeDemoSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

