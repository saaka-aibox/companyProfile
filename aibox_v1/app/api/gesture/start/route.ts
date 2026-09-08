import { NextResponse } from "next/server";
import { startGestureProcess } from "../../../../lib/gesture-process";

export const runtime = "nodejs";

export function POST() {
  const status = startGestureProcess();

  if (status.error) {
    return NextResponse.json(status, { status: 500 });
  }

  return NextResponse.json(status);
}
