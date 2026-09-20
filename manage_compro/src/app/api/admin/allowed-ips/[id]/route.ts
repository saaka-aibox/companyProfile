import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../../lib/db";
import { withApiLogging } from "../../../../../lib/logger";

const updateAllowedIpSchema = z.object({
  label: z.string().max(100).nullable().optional(),
  enabled: z.boolean().optional(),
});

async function patchHandler(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = updateAllowedIpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await db.allowedIP.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Allowed IP not found" }, { status: 404 });
  }

  const record = await db.allowedIP.update({
    where: { id },
    data: {
      label: parsed.data.label ?? existing.label,
      enabled: parsed.data.enabled ?? existing.enabled,
    },
  });
  return NextResponse.json(record);
}

async function deleteHandler(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await db.allowedIP.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Allowed IP not found" }, { status: 404 });
  }

  await db.allowedIP.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

export const PATCH = withApiLogging(patchHandler, "AllowedIPsAPI");
export const DELETE = withApiLogging(deleteHandler, "AllowedIPsAPI");