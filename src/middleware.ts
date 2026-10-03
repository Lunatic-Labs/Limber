import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

// Edge-safe auth instance: no DB/bcrypt imports (see auth.config.ts).
const { auth } = NextAuth(authConfig);

// Route-level gate: anything under /physician requires role
// "physician", anything under /patient requires role "patient".
// Signed-out users are bounced to /login; signed-in users with the
// wrong role are bounced home (which itself redirects them to
// their own dashboard — see src/app/page.tsx).
export default auth((req) => {
  const { nextUrl } = req;
  const role = req.auth?.user?.role;
  const isLoggedIn = !!req.auth?.user;

  const isPhysicianRoute = nextUrl.pathname.startsWith("/physician");
  const isPatientRoute = nextUrl.pathname.startsWith("/patient");

  if (!isPhysicianRoute && !isPatientRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPhysicianRoute && role !== "physician") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isPatientRoute && role !== "patient") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/physician/:path*", "/patient/:path*"],
};
