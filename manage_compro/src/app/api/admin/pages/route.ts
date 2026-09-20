import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageInputSchema } from "@/schemas/page";

export async function GET() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(pages);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = pageInputSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[POST /api/admin/pages] Validation failed:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const page = await db.page.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        blocks: parsed.data.blocks,
        status: "DRAFT",
      },
    });
    console.log(`[POST /api/admin/pages] Created page "${page.title}" (id: ${page.id})`);
    return NextResponse.json(page);
  } catch (err: unknown) {
    console.error("[POST /api/admin/pages] DB error:", err);
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: `Slug "${parsed.data.slug}" sudah digunakan. Silakan gunakan slug lain.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Gagal menyimpan ke database" }, { status: 500 });
  }
}