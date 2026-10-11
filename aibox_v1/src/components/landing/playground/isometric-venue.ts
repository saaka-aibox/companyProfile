import * as THREE from "three";
import { createAnimatedGuests } from "./animated-guests";
import { BOOTH_LOCATION, PHOTO_SPOT } from "./booth-layout";
import { ScenePrimitives, scenePalette } from "./scene-primitives";
import { createVenueFurniture } from "./venue-furniture";
import { getVenue, type VenueId } from "./venue-presets";

/** Cutaway venues with physical materials, furnishings, and a working photo zone. */
export function createIsometricVenue(id: VenueId, dark: boolean) {
  const group = new THREE.Group();
  const palette = scenePalette(dark);
  const primitives = new ScenePrimitives();
  const furniture = createVenueFurniture(group, primitives, palette);
  primitives.slab(group, palette.edge, 14.2, 11.2, 0.27, -0.3);
  primitives.slab(group, palette.floor, 14, 11, 0.08, -0.08);

  // Small floor joints give the cutaway a believable scale.
  for (let index = -5; index <= 5; index++) {
    primitives.box(group, palette.line, [0.012, 0.005, 10.9], [index * 1.25, 0.003, 0]);
  }
  const zone = primitives.slab(group, palette.blueSoft, 3.1, 2.4, 0.025, 0.008);
  zone.position.set(BOOTH_LOCATION.x, 0.008, BOOTH_LOCATION.z);
  const spot = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.64, 32),
    new THREE.MeshBasicMaterial({ color: palette.blue, side: THREE.DoubleSide }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(PHOTO_SPOT.x, 0.026, PHOTO_SPOT.z);
  spot.userData.excludeFromPhoto = true;
  group.add(spot);

  // Single-sided cutaway panel: visible from the booth lens, open from above.
  const photoWall = primitives.panel(
    group,
    id === "launch" ? palette.blue : palette.linen,
    4.8,
    3.2,
    [PHOTO_SPOT.x, 1.6, 5.15],
    id === "coffee" ? "wood" : "fabric",
  );
  photoWall.rotation.y = Math.PI;
  const photoSign = primitives.label(
    group,
    id === "wedding"
      ? "BETTER TOGETHER"
      : id === "coffee"
        ? "GOOD COFFEE. GOOD MOMENTS."
        : id === "launch"
          ? "MAKE A MOMENT / AIBOX"
          : "YOUR MOMENT / AIBOX",
    id === "launch" ? palette.white : palette.ink,
    id === "launch" ? palette.blue : palette.linen,
    3.4,
    0.48,
  );
  photoSign.rotation.y = Math.PI;
  photoSign.position.set(PHOTO_SPOT.x, 2.75, 5.13);
  // Branding faces the photo lens, rather than occluding the cutaway from behind.
  (photoSign.material as THREE.MeshBasicMaterial).side = THREE.FrontSide;
  furniture.plant(PHOTO_SPOT.x - 2.1, 4.8, true);
  furniture.plant(PHOTO_SPOT.x + 2.1, 4.8, true);

  if (id === "coffee") {
    primitives.box(group, palette.wall, [11.8, 3.6, 0.18], [0, 1.8, -4.65], "plaster");
    primitives.box(group, palette.wood, [5.2, 1.05, 1.25], [1, 0.53, -3.55], "wood");
    primitives.box(group, palette.linen, [5.4, 0.13, 1.4], [1, 1.12, -3.55], "stone");
    const machine = primitives.box(group, palette.metal, [0.95, 0.62, 0.6], [1.7, 1.5, -3.65], "metal");
    primitives.box(machine, palette.charcoal, [0.7, 0.09, 0.13], [0, 0.14, 0.35]);
    for (const dx of [-0.26, 0.26])
      primitives.cylinder(group, palette.charcoal, 0.035, 0.13, [1.7 + dx, 1.42, -3.26], "metal");
    for (const x of [-0.25, 0.05, 0.35])
      primitives.cylinder(group, palette.white, 0.09, 0.18, [x, 1.3, -3.45]);
    primitives.box(group, palette.wood, [3.2, 0.12, 0.35], [-3.4, 2.65, -4.35], "wood");
    for (let index = 0; index < 7; index++)
      primitives.box(
        group,
        index % 2 ? palette.linen : palette.wood,
        [0.18, 0.37, 0.14],
        [-4.6 + index * 0.35, 2.91, -4.33],
      );
    const menu = primitives.label(group, "COFFEE & GOOD COMPANY", palette.linen, palette.charcoal, 3.8, 0.9);
    menu.position.set(1, 2.65, -4.53);
    // Window mullions, transparent glazing, and warm overhead fixtures.
    primitives.box(group, palette.glass, [0.035, 2.65, 3.4], [-6.5, 1.95, -2.1], "glass");
    for (const z of [-3.8, -2.1, -0.4])
      primitives.box(group, palette.charcoal, [0.07, 2.85, 0.06], [-6.5, 1.95, z], "metal");
    for (const y of [0.55, 3.38])
      primitives.box(group, palette.charcoal, [0.07, 0.06, 3.5], [-6.5, y, -2.1], "metal");
    furniture.table(-4.3, -2.2);
    furniture.bench(4.6, -3.6);
    furniture.pendant(-1, -3.55);
    furniture.pendant(2.5, -3.55);
  } else if (id === "wedding") {
    const arch = new THREE.Group();
    arch.position.set(0, 0, -3.95);
    for (const x of [-1.65, 1.65]) primitives.cylinder(arch, palette.gold, 0.055, 3.3, [x, 1.65, 0], "metal");
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.65, 3.2, 0),
      new THREE.Vector3(-1.1, 4.05, 0),
      new THREE.Vector3(0, 4.4, 0),
      new THREE.Vector3(1.1, 4.05, 0),
      new THREE.Vector3(1.65, 3.2, 0),
    ]);
    arch.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.06, 6, false),
        new THREE.MeshStandardMaterial({ color: palette.gold, metalness: 0.5, roughness: 0.4 }),
      ),
    );
    for (let index = 0; index < 16; index++) {
      const point = curve.getPoint(index / 15);
      primitives.sphere(
        arch,
        index % 3 ? palette.leaf : palette.rose,
        [0.18, 0.17, 0.18],
        [point.x, point.y, 0.04],
      );
    }
    for (const x of [-1.4, 1.4])
      primitives.box(arch, palette.linen, [0.55, 2.8, 0.04], [x, 1.9, -0.07], "fabric");
    group.add(arch);
    furniture.table(-4.3, -2.4, true);
    furniture.table(4.5, -2.9, true);
    for (let index = 0; index < 10; index++)
      primitives.sphere(
        group,
        palette.light,
        [0.055, 0.07, 0.055],
        [-5.7 + index * 1.25, 4 - Math.sin((index / 9) * Math.PI) * 0.55, -4.5],
      );
    // Floral accents behind the posing guest also appear in the captured portrait.
    for (const dx of [-1.75, 1.75])
      for (let index = 0; index < 4; index++)
        primitives.sphere(
          group,
          index % 2 ? palette.rose : palette.linen,
          [0.18, 0.16, 0.15],
          [PHOTO_SPOT.x + dx, 2.1 + index * 0.2, 5.08],
        );
  } else if (id === "launch") {
    primitives.box(group, palette.charcoal, [6.8, 0.35, 1.65], [0, 0.18, -3.7], "stone");
    primitives.box(group, palette.blue, [6.8, 3.55, 0.16], [0, 2, -4.45], "plaster");
    const sign = primitives.label(group, "aibox / MAKE A MOMENT", palette.white, palette.blue, 5.1, 0.85);
    sign.position.set(0, 2.5, -4.35);
    for (const x of [-4.85, 4.85]) {
      primitives.box(group, palette.white, [0.85, 1, 0.85], [x, 0.5, -3.2], "stone");
      primitives.sphere(group, palette.blue, [0.23, 0.23, 0.23], [x, 1.25, -3.2]);
    }
    furniture.softbox(-3.9, -4.1, 0.35);
    furniture.softbox(3.9, -4.1, -0.35);
    furniture.bench(-4.5, -1.95);
  } else {
    primitives.box(group, palette.wall, [7.5, 3.6, 0.18], [0, 1.8, -4.55], "plaster");
    primitives.box(group, palette.linen, [4.2, 3, 0.025], [0, 1.8, -4.43], "fabric");
    const roll = primitives.cylinder(group, palette.white, 0.15, 4.3, [0, 3.45, -4.35]);
    roll.rotation.z = Math.PI / 2;
    primitives.box(group, palette.linen, [4.2, 0.02, 1.4], [0, 0.014, -3.8], "fabric");
    furniture.softbox(-3.2, -3.5, 0.35);
    furniture.softbox(3.2, -3.5, -0.35);
    furniture.bench(-4.7, -1.9);
    const sign = primitives.label(group, "AIBOX / OPEN STUDIO", palette.ink, palette.wall, 3.1, 0.45);
    sign.position.set(0, 3.15, -4.43);
  }

  furniture.plant(-5.85, -4.2, true);
  furniture.plant(5.85, -4.2, true);
  const guests = createAnimatedGuests(primitives, palette, getVenue(id).guests);
  group.add(guests.group);
  return { group, guests, palette };
}

export type IsometricVenue = ReturnType<typeof createIsometricVenue>;
