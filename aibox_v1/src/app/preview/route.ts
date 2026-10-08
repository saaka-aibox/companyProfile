import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { withApiLogging } from "../../lib/logger";
import { isCmsEnabled } from "../../lib/site-config";

async function handler(request: Request) {
  if (!isCmsEnabled()) return NextResponse.json({ error: "CMS preview is disabled" }, { status: 404 });
  const url = new URL(request.url);
  const secret = process.env.PREVIEW_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const target = new URL(url.searchParams.get("slug") || "/", request.url);
  if (target.origin !== url.origin) return NextResponse.json({ error: "Preview must redirect within this site" }, { status: 400 });
  (await draftMode()).enable();
  return NextResponse.redirect(target);
}

export const GET = withApiLogging(handler, "Preview");
