import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withApiLogging } from "../../../../lib/logger";
import { Prisma } from "@prisma/client";

const defaultItems = [
  { label: "Home", href: "/" },
  { label: "Contact", href: "/#contact" },
];

async function handler() {
  const navigation = await db.navigation.findFirst({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ items: navigation?.items ?? defaultItems });
}
export const GET = withApiLogging(async () => handler(), "NavigationAPI");

async function updateHandler(request: Request) {
  const body = await request.json().catch(() => null) as { items?: unknown } | null;
  if (
    !body ||
    !Array.isArray(body.items) ||
    !body.items.every((item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { label?: unknown }).label === "string" &&
      (item as { label: string }).label.trim().length > 0 &&
      typeof (item as { href?: unknown }).href === "string" &&
      (item as { href: string }).href.trim().length > 0
    )
  ) {
    return NextResponse.json({ error: "items must contain label and href" }, { status: 400 });
  }

  const items = JSON.parse(JSON.stringify(body.items)) as Prisma.InputJsonValue;
  const existing = await db.navigation.findFirst({ orderBy: { updatedAt: "desc" } });
  const navigation = existing
    ? await db.navigation.update({ where: { id: existing.id }, data: { items } })
    : await db.navigation.create({ data: { items } });
  return NextResponse.json({ items: navigation.items });
}

export const PUT = withApiLogging(updateHandler, "NavigationAPI");
