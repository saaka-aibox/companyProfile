import type { RoomFrameId } from "./protocol";

/** Thin lazy wrapper over compose.ts so the lobby bundle stays small. */
export async function buildRoundTile(frameId: RoomFrameId, urls: string[]): Promise<HTMLCanvasElement> {
  const { loadImage, buildGroupTile, tileSizeFor } = await import("./compose");
  const images = await Promise.all(urls.map((url) => loadImage(url)));
  const size = tileSizeFor(frameId);
  return buildGroupTile(images, size.width, size.height);
}

export async function composeStrip(frameId: RoomFrameId, tiles: HTMLCanvasElement[]): Promise<{ final: Blob; thumb: Blob }> {
  const { composeRoomStrip } = await import("./compose");
  const { final, thumb, preview } = await composeRoomStrip(frameId, tiles);
  URL.revokeObjectURL(preview);
  return { final, thumb };
}
