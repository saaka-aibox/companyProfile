import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withApiLogging } from "../../../../lib/logger";
async function handler() {
  const settings = await db.siteSetting.findMany();
  return NextResponse.json(Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
}
export const GET = withApiLogging(async () => handler(), "SettingsAPI");
