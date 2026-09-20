import { NextResponse } from "next/server";
import { withApiLogging } from "../../../../lib/logger";
async function getHandler() { return NextResponse.json({ authenticated: false }); }
async function postHandler() { return NextResponse.json({ authenticated: false }, { status: 401 }); }
export const GET = withApiLogging(async () => getHandler(), "AuthAPI");
export const POST = withApiLogging(async () => postHandler(), "AuthAPI");
