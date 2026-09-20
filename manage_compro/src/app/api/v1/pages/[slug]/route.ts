import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "../../../../../lib/db";
import { pageInputSchema } from "../../../../../schemas/page";
import { withApiLogging } from "../../../../../lib/logger";

type RouteContext = { params: Promise<{ slug: string }> };

async function getHandler(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const preview = new URL(request.url).searchParams.get("preview") === "true";
  const page = await db.page.findUnique({ where: { slug } });

  if (!page || (!preview && page.status !== "PUBLISHED")) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    blocks: page.blocks,
    status: page.status,
    publishedAt: page.publishedAt,
  });
}

async function putHandler(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const parsed = pageInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid page payload", issues: parsed.error.issues }, { status: 400 });

  const blocks = JSON.parse(JSON.stringify(parsed.data.blocks)) as Prisma.InputJsonValue;
  const page = await db.page.upsert({
    where: { slug },
    create: { ...parsed.data, blocks },
    update: { ...parsed.data, blocks },
  });
  return NextResponse.json(page, { status: 200 });
}

export const GET = withApiLogging(getHandler, "ContentAPI");
export const PUT = withApiLogging(putHandler, "ContentAPI");
