import * as THREE from "three";
import { createAnimatedGuests } from "./animated-guests";
import { ScenePrimitives, scenePalette } from "./scene-primitives";
import { getVenue, type VenueId } from "./venue-presets";

export const BOOTH_LOCATION = { x: 1.1, z: .65 };

/** Native, low-poly venues. No panorama downloads or external animation assets. */
export function createIsometricVenue(id: VenueId, dark: boolean) {
  const group = new THREE.Group();
  const palette = scenePalette(dark);
  const primitives = new ScenePrimitives();
  primitives.slab(group, palette.edge, 14.2, 11.2, .27, -.3);
  primitives.slab(group, palette.floor, 14, 11, .08, -.08);

  function plant(x: number, z: number, tall = false) {
    const height = tall ? 1.75 : .85;
    primitives.shadow(group, 1.8, 1.5, x, z);
    primitives.cylinder(group, palette.white, .38, .65, [x, .33, z]);
    primitives.cylinder(group, palette.wood, .065, height, [x, .65 + height / 2, z]);
    primitives.sphere(group, palette.leaf, [.57, height * .45, .52], [x, .65 + height, z]);
    primitives.sphere(group, palette.leafLight, [.4, height * .35, .4], [x + .25, .65 + height * .85, z + .15]);
  }

  function table(x: number, z: number, wedding = false) {
    primitives.shadow(group, 2.8, 2.4, x, z);
    primitives.cylinder(group, palette.wood, .13, 1.15, [x, .57, z]);
    primitives.cylinder(group, wedding ? palette.white : palette.wood, .95, .13, [x, 1.2, z]);
    primitives.cylinder(group, palette.white, .12, .21, [x, 1.37, z]);
    if (wedding) primitives.sphere(group, palette.rose, [.22, .2, .22], [x, 1.55, z]);
    else primitives.cylinder(group, palette.gold, .055, .04, [x, 1.48, z]);
    for (const offset of [-1.35, 1.35]) {
      primitives.cylinder(group, palette.wood, .075, .66, [x + offset, .33, z]);
      primitives.cylinder(group, wedding ? palette.rose : palette.leaf, .33, .14, [x + offset, .73, z]);
    }
  }

  function bench(x: number, z: number) {
    primitives.shadow(group, 3.2, 1.6, x, z);
    primitives.box(group, palette.wood, [2.7, .2, .8], [x, .65, z]);
    primitives.box(group, palette.wall, [2.7, .65, .14], [x, 1.04, z - .35]);
    for (const offset of [-1, 1]) primitives.box(group, palette.ink, [.13, .6, .55], [x + offset, .3, z]);
  }

  function sign(text: string, x: number, z: number, color = palette.blue) {
    const label = primitives.label(group, text, palette.white, color, 3, .75);
    label.position.set(x, 2.8, z);
    primitives.box(group, palette.white, [.08, 2.9, .08], [x - 1.05, 1.45, z]);
    primitives.box(group, palette.white, [.08, 2.9, .08], [x + 1.05, 1.45, z]);
  }

  // Blue inset and a floor label locate the booth without surrounding it with UI effects.
  const zone = primitives.slab(group, palette.blueSoft, 3.45, 2.95, .035, .002);
  zone.position.set(BOOTH_LOCATION.x, .002, BOOTH_LOCATION.z);
  const boothShadow = primitives.shadow(group, 3.6, 3, BOOTH_LOCATION.x, BOOTH_LOCATION.z);
  boothShadow.position.y = .043;
  const floorLabel = primitives.label(group, "AIBOX / PHOTO ZONE", palette.blue, palette.blueSoft, 2.7, .5);
  floorLabel.rotation.x = -Math.PI / 2;
  floorLabel.position.set(BOOTH_LOCATION.x, .047, BOOTH_LOCATION.z + 1.13);

  // Sparse path markers add scale; guests follow the open aisle around the booth.
  for (let index = 0; index < 8; index++) {
    primitives.box(group, palette.line, [.28, .015, .06], [-3.2 + index * .88, .012, 4.8]);
  }

  if (id === "wedding") {
    const arch = new THREE.Group();
    arch.position.set(-.45, 0, -3.65);
    primitives.box(arch, palette.white, [.2, 3.45, .25], [-1.6, 1.73, 0]);
    primitives.box(arch, palette.white, [.2, 3.45, .25], [1.6, 1.73, 0]);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.6, 3.4, 0), new THREE.Vector3(-1.1, 4.25, 0),
      new THREE.Vector3(0, 4.55, 0), new THREE.Vector3(1.1, 4.25, 0), new THREE.Vector3(1.6, 3.4, 0),
    ]);
    arch.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .11, 6, false), new THREE.MeshStandardMaterial({ color: palette.white, roughness: .8 })));
    for (let index = 0; index < 7; index++) {
      const point = curve.getPoint(index / 6);
      primitives.sphere(arch, index % 2 ? palette.rose : palette.leafLight, [.23, .23, .23], [point.x, point.y, .1]);
    }
    group.add(arch);
    table(-4.2, -2.9, true);
    bench(4.4, -3.55);
    plant(-5.9, -4.1, true);
    plant(5.8, -4.2, true);
  } else if (id === "coffee") {
    primitives.box(group, palette.wall, [11.5, 2.8, .18], [0, 1.4, -4.55]);
    primitives.box(group, palette.wood, [4.4, 1.1, 1.2], [1.1, .55, -3.45]);
    primitives.box(group, palette.white, [4.6, .14, 1.3], [1.1, 1.18, -3.45]);
    primitives.box(group, palette.ink, [.75, .62, .5], [1.5, 1.55, -3.6]);
    primitives.box(group, palette.white, [.58, .12, .4], [1.5, 1.3, -3.25]);
    for (const x of [-.2, .2]) primitives.cylinder(group, palette.white, .09, .18, [x, 1.34, -3.4]);
    const menu = primitives.label(group, "COFFEE & GOOD COMPANY", palette.ink, palette.wall, 4.1, 1);
    menu.position.set(.7, 2.27, -4.44);
    table(-4.1, -2.6);
    plant(-5.8, -4.1, true);
    plant(5.5, -3.9, true);
  } else if (id === "launch") {
    primitives.box(group, palette.blue, [6.2, 3.4, .17], [0, 1.7, -4.25]);
    const branding = primitives.label(group, "aibox / MAKE A MOMENT", palette.white, palette.blue, 5.1, 1.1);
    branding.position.set(0, 2.2, -4.15);
    for (const x of [-4.8, -3.45]) {
      primitives.box(group, palette.white, [.95, .9, .95], [x, .45, -2.9]);
      primitives.sphere(group, x < -4 ? palette.gold : palette.blue, [.28, .28, .28], [x, 1.2, -2.9]);
    }
    bench(4.2, -3.5);
    plant(-5.7, -4.35, true);
    plant(5.7, -4.1, true);
  } else {
    primitives.box(group, palette.wall, [5.9, 2.9, .17], [-.4, 1.45, -4.1]);
    sign("AIBOX / OPEN STUDIO", -.4, -3.95);
    bench(-4.5, -3);
    plant(-5.9, -4.3, true);
    plant(4.9, -3.8, true);
  }

  const guests = createAnimatedGuests(primitives, palette, getVenue(id).guests);
  group.add(guests.group);
  guests.update(0);
  return { group, update: guests.update, palette };
}

export type IsometricVenue = ReturnType<typeof createIsometricVenue>;
