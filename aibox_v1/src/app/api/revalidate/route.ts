import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { withApiLogging } from "../../../lib/logger";
import { isCmsEnabled } from "../../../lib/site-config";

async function handler(request: Request) {
  if (!isCmsEnabled()) return NextResponse.json({ error: "CMS revalidation is disabled" }, { status: 404 });
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { slug?: string };
  if (body.slug) revalidateTag(`page:${body.slug}`, "max");
  return NextResponse.json({ revalidated: Boolean(body.slug) });
}

export const POST = withApiLogging(handler, "Revalidate");
