import { NextResponse } from "next/server";
import { startGestureProcess } from "../../../../lib/gesture-process";
import { withApiLogging } from "../../../../lib/logger";

async function handler() {
  const status = startGestureProcess();

  if (status.error) {
    return NextResponse.json(status, { status: 500 });
  }

  return NextResponse.json(status);
}

export const POST = withApiLogging(async () => handler(), "GestureAPI");
