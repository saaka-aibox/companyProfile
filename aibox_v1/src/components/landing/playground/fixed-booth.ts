import * as THREE from "three";
import { ScenePrimitives, scenePalette } from "./scene-primitives";
import { BOOTH_LOCATION } from "./booth-layout";

/** A deliberately unfinished volume; the fixed product has no published model yet. */
export function createFixedBooth(dark: boolean) {
  const group = new THREE.Group();
  const palette = scenePalette(dark);
  const primitives = new ScenePrimitives();
  group.position.set(BOOTH_LOCATION.x, 0, BOOTH_LOCATION.z);
  primitives.box(group, palette.edge, [2.05, 0.16, 1.9], [0, 0.08, 0]);
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 3.5, 1.8),
    new THREE.MeshStandardMaterial({
      color: palette.white,
      transparent: true,
      opacity: 0.13,
      roughness: 0.65,
      depthWrite: false,
    }),
  );
  shell.position.y = 1.95;
  group.add(shell);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(shell.geometry),
    new THREE.LineBasicMaterial({ color: palette.blue, transparent: true, opacity: 0.55 }),
  );
  outline.position.copy(shell.position);
  group.add(outline);
  const core = primitives.box(group, palette.blueSoft, [0.85, 0.85, 0.85], [0, 2.05, 0]);
  const scanner = primitives.box(group, palette.blue, [1.8, 0.025, 1.7], [0, 1, 0]);
  const sign = primitives.label(group, "FIXED / COMING SOON", palette.ink, palette.wall, 2.3, 0.46);
  sign.position.set(0, 3.05, 0.94);
  return {
    group,
    update(elapsed: number) {
      core.rotation.set(0.2, elapsed * 0.3, 0.15);
      core.position.y = 2.05 + Math.sin(elapsed * 1.2) * 0.08;
      scanner.position.y = 1.2 + (Math.sin(elapsed * 0.9) + 1) * 0.85;
    },
  };
}
