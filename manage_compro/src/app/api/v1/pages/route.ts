import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "../../../../lib/db";
import { pageInputSchema } from "../../../../schemas/page";
import { withApiLogging } from "../../../../lib/logger";

async function getHandler() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(pages);
}

async function postHandler(request: Request) {
  const parsed = pageInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid page payload", issues: parsed.error.issues }, { status: 400 });
  const blocks = JSON.parse(JSON.stringify(parsed.data.blocks)) as Prisma.InputJsonValue;
  const page = await db.page.create({ data: { ...parsed.data, blocks } });
  return NextResponse.json(page, { status: 201 });
}

export const GET = withApiLogging(getHandler, "ContentAPI");
export const POST = withApiLogging(postHandler, "ContentAPI");
