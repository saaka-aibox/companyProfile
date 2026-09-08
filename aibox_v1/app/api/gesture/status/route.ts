import { NextResponse } from "next/server";
import { getGestureStatus } from "../../../../lib/gesture-process";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getGestureStatus());
}
