import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePage } from "@/lib/publish";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await db.page.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await revalidatePage(page.slug);
  return NextResponse.json(page);
}