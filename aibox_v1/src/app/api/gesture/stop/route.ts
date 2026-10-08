import { NextResponse } from "next/server";
import { stopGestureProcess } from "../../../../lib/gesture-process";
import { withApiLogging } from "../../../../lib/logger";

async function handler() {
  const status = stopGestureProcess();
  return NextResponse.json(status, { status: status.supported ? 200 : 503 });
}

export const POST = withApiLogging(async () => handler(), "GestureAPI");
