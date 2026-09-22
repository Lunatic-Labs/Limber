import { NextResponse } from "next/server";

// Simple liveness check — hit /api/health after deploying to Vercel
// to confirm the app is running before wiring up auth/db/etc.
export async function GET() {
  return NextResponse.json({ status: "ok", service: "limber" });
}
