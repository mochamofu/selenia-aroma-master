import { NextResponse, type NextRequest } from "next/server";

const customerOnlyBlockedPrefixes = ["/admin", "/operator"];

export function proxy(request: NextRequest) {
  const appTarget = process.env.NEXT_PUBLIC_APP_TARGET ?? "all";
  const { pathname } = request.nextUrl;

  if (appTarget === "customer" && customerOnlyBlockedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operator/:path*"],
};
