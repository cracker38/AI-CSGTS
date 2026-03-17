import { NextResponse, type NextRequest } from "next/server";

function isProtectedPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const session = req.cookies.get("demo_session")?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};

