import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { publish } from "../../../lib/publish";
import { withApiLogging } from "../../../lib/logger";

async function handler(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: string } | null;
  if (!body?.slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const page = await db.page.update({
    where: { slug: body.slug },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  }).catch(() => null);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const webhook = await publish(body.slug);
  return NextResponse.json({ published: true, slug: page.slug, webhook });
}

export const POST = withApiLogging(handler, "PublishAPI");
