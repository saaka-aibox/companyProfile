import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { withApiLogging } from "../../lib/logger";

async function handler(request: Request) {
  const url = new URL(request.url);
  if (process.env.PREVIEW_SECRET && url.searchParams.get("secret") !== process.env.PREVIEW_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  (await draftMode()).enable();
  return NextResponse.redirect(new URL(url.searchParams.get("slug") || "/", request.url));
}

export const GET = withApiLogging(handler, "Preview");
