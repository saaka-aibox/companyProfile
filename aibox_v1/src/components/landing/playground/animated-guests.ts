import * as THREE from "three";
import { ScenePrimitives, type ScenePalette } from "./scene-primitives";

type Guest = {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  path: THREE.CatmullRomCurve3 | null;
  phase: number;
  waving: boolean;
};

const skinTones = ["#c98e6d", "#e6b492", "#865840", "#d7a07f"];
const hairColors = ["#293344", "#594334", "#382e2b", "#443638"];

function createGuest(primitives: ScenePrimitives, palette: ScenePalette, index: number): Guest {
  const group = new THREE.Group();
  const shirt = [palette.blue, palette.rose, palette.gold, palette.leaf, palette.white, palette.ink][index % 6];
  const skin = skinTones[index % skinTones.length];
  const hair = hairColors[index % hairColors.length];
  const trousers = index % 2 === 0 ? "#344863" : "#6b6d76";
  const limb = (x: number, y: number, color: string, length: number, radius: number) => {
    const joint = new THREE.Group();
    joint.position.set(x, y, 0);
    primitives.capsule(joint, color, radius, length, [0, -length / 2, 0]);
    group.add(joint);
    return joint;
  };

  primitives.capsule(group, shirt, .28, .42, [0, 1.35, 0]);
  primitives.sphere(group, skin, [.24, .29, .23], [0, 2.02, 0]);
  primitives.sphere(group, hair, [.25, .16, .24], [0, 2.18, -.025]);
  primitives.cylinder(group, skin, .09, .16, [0, 1.76, 0]);
  const leftArm = limb(-.36, 1.6, shirt, .42, .09);
  const rightArm = limb(.36, 1.6, shirt, .42, .09);
  primitives.sphere(leftArm, skin, [.1, .12, .1], [0, -.55, 0]);
  primitives.sphere(rightArm, skin, [.1, .12, .1], [0, -.55, 0]);
  const leftLeg = limb(-.15, .93, trousers, .62, .1);
  const rightLeg = limb(.15, .93, trousers, .62, .1);
  primitives.box(leftLeg, hair, [.21, .13, .35], [0, -.78, .06]);
  primitives.box(rightLeg, hair, [.21, .13, .35], [0, -.78, .06]);
  primitives.shadow(group, 1.4, 1.1);
  group.scale.setScalar(index % 2 === 0 ? .96 : 1.04);
  return { group, leftArm, rightArm, leftLeg, rightLeg, path: null, phase: index * .21, waving: false };
}

/** Closed walking routes keep guests away from the booth and venue furniture. */
export function createAnimatedGuests(primitives: ScenePrimitives, palette: ScenePalette, count: number) {
  const group = new THREE.Group();
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.7, 0, 1.2), new THREE.Vector3(-3.5, 0, 3.6),
    new THREE.Vector3(.4, 0, 4.05), new THREE.Vector3(4.9, 0, 2.6),
    new THREE.Vector3(5.1, 0, -.9), new THREE.Vector3(2.5, 0, -1.6),
    new THREE.Vector3(-1.7, 0, -1.8),
  ], true, "centripetal");
  const guests = Array.from({ length: count }, (_, index) => {
    const guest = createGuest(primitives, palette, index);
    if (index < count - 2) guest.path = route;
    else {
      guest.group.position.set(index === count - 1 ? -.7 : 3, 0, index === count - 1 ? .6 : .4);
      guest.group.rotation.y = index === count - 1 ? Math.PI / 2 : -Math.PI / 2;
      guest.waving = index === count - 1;
    }
    group.add(guest.group);
    return guest;
  });
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  return {
    group,
    update(elapsed: number) {
      guests.forEach((guest, index) => {
        if (guest.path) {
          const progress = (guest.phase + elapsed / (46 + index * 5)) % 1;
          guest.path.getPointAt(progress, point);
          guest.path.getTangentAt(progress, tangent);
          guest.group.position.copy(point);
          guest.group.rotation.y = Math.atan2(tangent.x, tangent.z);
          const stride = Math.sin(elapsed * 4.8 + index * 2.2) * .34;
          guest.leftLeg.rotation.x = stride;
          guest.rightLeg.rotation.x = -stride;
          guest.leftArm.rotation.x = -stride * .7;
          guest.rightArm.rotation.x = stride * .7;
          guest.group.position.y = Math.abs(Math.sin(elapsed * 4.8 + index * 2.2)) * .025;
        } else if (guest.waving) {
          guest.rightArm.rotation.z = -2.45 + Math.sin(elapsed * 2) * .18;
          guest.leftArm.rotation.z = .12;
        } else {
          guest.leftArm.rotation.z = .14;
          guest.rightArm.rotation.z = -.14;
        }
      });
    },
  };
}
