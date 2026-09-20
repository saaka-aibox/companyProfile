import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageInputSchema } from "@/schemas/page";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = pageInputSchema.safeParse(body);
  if (!parsed.success) {
    // Log the full Zod error tree to server console for debugging
    console.error(`[PATCH /api/admin/pages/${id}] Validation failed:`);
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const statusValue = parsed.data.status ? parsed.data.status.toUpperCase() : undefined;

  try {
    const page = await db.page.update({
      where: { id },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        blocks: parsed.data.blocks,
        ...(statusValue ? { status: statusValue } : {}),
        ...(statusValue === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
    });

    if (page.status === "PUBLISHED") {
      const { revalidatePage } = await import("@/lib/publish");
      await revalidatePage(page.slug).catch((err: unknown) => {
        console.warn(`[PATCH] Revalidate failed for slug "${page.slug}":`, err);
      });
    }

    console.log(`[PATCH /api/admin/pages/${id}] Saved page "${page.title}" (status: ${page.status})`);
    return NextResponse.json(page);
  } catch (err: unknown) {
    console.error(`[PATCH /api/admin/pages/${id}] DB error:`, err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.page.delete({ where: { id } });
    console.log(`[DELETE /api/admin/pages/${id}] Page deleted`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(`[DELETE /api/admin/pages/${id}] DB error:`, err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}