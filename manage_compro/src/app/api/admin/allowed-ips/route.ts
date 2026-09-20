import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { withApiLogging } from "../../../../lib/logger";

const createAllowedIpSchema = z.object({
  ip: z.string().min(1).max(45),
  label: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
});

async function getHandler() {
  const allowedIps = await db.allowedIP.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(allowedIps);
}

async function postHandler(request: Request) {
  const parsed = createAllowedIpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const record = await db.allowedIP.create({
      data: {
        ip: parsed.data.ip,
        label: parsed.data.label ?? null,
        enabled: parsed.data.enabled ?? true,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "IP is already in the whitelist" }, { status: 409 });
  }
}

export const GET = withApiLogging(getHandler, "AllowedIPsAPI");
export const POST = withApiLogging(postHandler, "AllowedIPsAPI");