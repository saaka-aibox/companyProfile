import * as THREE from "three";
import { ScenePrimitives, type ScenePalette } from "./scene-primitives";

/** Shared, human-scale furnishings used by the four venue builders. */
export function createVenueFurniture(group: THREE.Group, primitives: ScenePrimitives, palette: ScenePalette) {
  function plant(x: number, z: number, tall = false) {
    const height = tall ? 1.65 : 0.75;
    primitives.cylinder(group, palette.linen, 0.32, 0.55, [x, 0.28, z], "stone");
    primitives.cylinder(group, palette.wood, 0.035, height, [x, 0.55 + height / 2, z], "wood");
    for (let index = 0; index < 5; index++) {
      const angle = index * 2.4;
      const leaf = primitives.sphere(
        group,
        index % 2 ? palette.leaf : palette.leafLight,
        [0.17, 0.42, 0.12],
        [x + Math.cos(angle) * 0.26, 0.65 + height - index * 0.12, z + Math.sin(angle) * 0.26],
      );
      leaf.rotation.z = Math.cos(angle) * 0.65;
    }
  }

  function chair(x: number, z: number, rotation = 0) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotation;
    primitives.box(chair, palette.wood, [0.62, 0.09, 0.6], [0, 0.66, 0], "wood");
    primitives.box(chair, palette.wood, [0.62, 0.58, 0.07], [0, 1, -0.26], "wood");
    for (const dx of [-0.24, 0.24])
      for (const dz of [-0.23, 0.23]) {
        primitives.box(chair, palette.wood, [0.055, 0.65, 0.055], [dx, 0.32, dz], "wood");
      }
    group.add(chair);
  }

  function table(x: number, z: number, wedding = false) {
    primitives.cylinder(group, palette.charcoal, 0.08, 1.1, [x, 0.55, z], "metal");
    primitives.cylinder(group, palette.charcoal, 0.4, 0.06, [x, 0.05, z], "metal");
    primitives.cylinder(
      group,
      wedding ? palette.linen : palette.wood,
      0.9,
      0.1,
      [x, 1.15, z],
      wedding ? "fabric" : "wood",
    );
    if (wedding) {
      primitives.cylinder(group, palette.linen, 0.91, 0.22, [x, 1.06, z], "fabric");
      primitives.cylinder(group, palette.gold, 0.12, 0.3, [x, 1.37, z], "metal");
      for (const dx of [-0.15, 0.1, 0.24])
        primitives.sphere(group, palette.rose, [0.16, 0.16, 0.16], [x + dx, 1.58, z]);
      for (const dx of [-0.5, 0.5])
        primitives.cylinder(group, palette.light, 0.05, 0.19, [x + dx, 1.3, z + 0.25]);
    } else {
      for (const dx of [-0.3, 0.3]) {
        primitives.cylinder(group, palette.white, 0.13, 0.04, [x + dx, 1.24, z]);
        primitives.cylinder(group, palette.linen, 0.085, 0.15, [x + dx, 1.32, z]);
        primitives.cylinder(group, palette.wood, 0.07, 0.008, [x + dx, 1.4, z]);
      }
    }
    chair(x - 1.25, z, Math.PI / 2);
    chair(x + 1.25, z, -Math.PI / 2);
  }

  function bench(x: number, z: number) {
    primitives.box(group, palette.wood, [2.7, 0.16, 0.75], [x, 0.65, z], "wood");
    primitives.box(group, palette.linen, [2.55, 0.17, 0.65], [x, 0.8, z], "fabric");
    primitives.box(group, palette.wall, [2.7, 0.6, 0.12], [x, 1.02, z - 0.3], "fabric");
    for (const dx of [-1, 1])
      primitives.box(group, palette.charcoal, [0.08, 0.6, 0.5], [x + dx, 0.3, z], "metal");
  }

  function pendant(x: number, z: number) {
    primitives.cylinder(group, palette.charcoal, 0.02, 1, [x, 3.85, z], "metal");
    primitives.sphere(group, palette.light, [0.22, 0.24, 0.22], [x, 3.22, z]);
    primitives.cylinder(group, palette.gold, 0.27, 0.17, [x, 3.4, z], "metal");
  }

  function softbox(x: number, z: number, rotation = 0) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    lamp.rotation.y = rotation;
    primitives.cylinder(lamp, palette.charcoal, 0.045, 2.9, [0, 1.45, 0], "metal");
    for (const angle of [0, 2.1, 4.2]) {
      const leg = primitives.box(
        lamp,
        palette.charcoal,
        [0.06, 0.06, 0.85],
        [Math.sin(angle) * 0.34, 0.05, Math.cos(angle) * 0.34],
        "metal",
      );
      leg.rotation.y = angle;
    }
    primitives.box(lamp, palette.charcoal, [1.1, 1.35, 0.18], [0, 2.65, 0]);
    primitives.box(lamp, palette.white, [1.02, 1.27, 0.025], [0, 2.65, 0.105], "fabric");
    group.add(lamp);
  }

  return { plant, chair, table, bench, pendant, softbox };
}
