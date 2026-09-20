import { NextResponse } from "next/server";
import { getGestureStatus } from "../../../../lib/gesture-process";
import { withApiLogging } from "../../../../lib/logger";

async function handler() {
  return NextResponse.json(getGestureStatus());
}

export const GET = withApiLogging(async () => handler(), "GestureAPI");
