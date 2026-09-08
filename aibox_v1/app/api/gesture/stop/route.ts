import { NextResponse } from "next/server";
import { stopGestureProcess } from "../../../../lib/gesture-process";

export const runtime = "nodejs";

export function POST() {
  return NextResponse.json(stopGestureProcess());
}
