import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("bm_session");
  const { pathname } = request.nextUrl;

  // already logged in → can't access onboarding
  if (pathname.startsWith("/onboarding") && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/onboarding/:path*"],
};
