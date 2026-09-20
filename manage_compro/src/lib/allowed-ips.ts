import { db } from "./db";

// Returns the enabled IPs from the allowed-IP whitelist, or null when the
// database is unreachable so callers can fall back to their own defaults.
export async function getAllowedIpsFromDb(): Promise<string[] | null> {
  try {
    const records = await db.allowedIP.findMany({
      where: { enabled: true },
      select: { ip: true },
    });
    return records.map((record) => record.ip);
  } catch {
    return null;
  }
}