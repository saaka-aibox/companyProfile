import * as THREE from "three";
import { BOOTH_LOCATION, PHOTO_SPOT } from "./booth-layout";
import { getVenue, type VenueId } from "./venue-presets";

const WIDTH = 600;
const HEIGHT = 750;

/** Render an actual portrait from the booth lens, then add a printable AIBox frame. */
export function captureBoothPhoto(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  venue: VenueId,
  guest: number,
) {
  const camera = new THREE.PerspectiveCamera(48, WIDTH / HEIGHT, 0.1, 35);
  camera.position.set(BOOTH_LOCATION.x, 1.8, BOOTH_LOCATION.z + 0.18);
  camera.lookAt(PHOTO_SPOT.x, 1.3, PHOTO_SPOT.z);
  const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { depthBuffer: true });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const previousTarget = renderer.getRenderTarget();
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, WIDTH, HEIGHT, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    target.dispose();
  }

  const portrait = document.createElement("canvas");
  portrait.width = WIDTH;
  portrait.height = HEIGHT;
  const portraitContext = portrait.getContext("2d");
  if (!portraitContext) throw new Error("Photo preview is unavailable");
  const image = portraitContext.createImageData(WIDTH, HEIGHT);
  // WebGL's origin is at the bottom left; exported photos use a top-left origin.
  const rowLength = WIDTH * 4;
  for (let row = 0; row < HEIGHT; row++) {
    image.data.set(
      pixels.subarray((HEIGHT - row - 1) * rowLength, (HEIGHT - row) * rowLength),
      row * rowLength,
    );
  }
  portraitContext.putImageData(image, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = 660;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo frame is unavailable");
  const preset = getVenue(venue);
  context.fillStyle = preset.frame;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(portrait, 30, 30);
  context.fillStyle = preset.frameInk;
  context.font = "600 28px sans-serif";
  context.fillText("aibox", 30, 830);
  context.font = "15px monospace";
  context.textAlign = "right";
  context.fillText(`${preset.name.toLowerCase()} / guest ${String(guest + 1).padStart(2, "0")}`, 630, 830);
  context.textAlign = "left";
  context.font = "12px monospace";
  context.fillText("a little moment, made yours. / virtual photo", 30, 871);
  return canvas.toDataURL("image/png");
}
