export type UserRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN" | "SYSTEM_ADMIN";

export type DemoSession = {
  email: string;
  fullName: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING";
};

export function parseDemoSession(cookieValue: string | undefined): DemoSession | null {
  if (!cookieValue) return null;
  try {
    const json = Buffer.from(cookieValue, "base64url").toString("utf8");
    const data = JSON.parse(json) as DemoSession;
    if (!data?.email || !data?.role || !data?.status) return null;
    return data;
  } catch {
    return null;
  }
}

export function encodeDemoSession(session: DemoSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

