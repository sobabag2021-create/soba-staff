import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ip = forwarded?.split(",")[0]?.trim() || realIp || "";
  const allowedIp = process.env.STORE_ALLOWED_IP || "";

  return NextResponse.json({
    allowed: Boolean(ip && allowedIp && ip === allowedIp),
    ip,
  });
}
