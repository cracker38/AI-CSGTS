import { NextResponse } from "next/server";
import { encodeDemoSession, type DemoSession } from "@/lib/demoSession";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; fullName?: string }
    | null;

  const email = (body?.email ?? "").trim().toLowerCase();
  const fullName = (body?.fullName ?? "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const session: DemoSession = { email, fullName, role: "EMPLOYEE", status: "PENDING" };
  const res = NextResponse.json({ ok: true });
  res.cookies.set("demo_session", encodeDemoSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

