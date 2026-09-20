import { NextResponse } from "next/server";
import { stopGestureProcess } from "../../../../lib/gesture-process";
import { withApiLogging } from "../../../../lib/logger";

async function handler() {
  return NextResponse.json(stopGestureProcess());
}

export const POST = withApiLogging(async () => handler(), "GestureAPI");
