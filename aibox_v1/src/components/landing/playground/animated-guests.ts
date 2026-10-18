import * as THREE from "three";
import { PHOTO_SPOT } from "./booth-layout";
import { ScenePrimitives, type ScenePalette } from "./scene-primitives";
import { EMPTY_VISITOR_HAND, VISITOR_GUEST, type VisitorHand } from "./playground-types";

type Guest = {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  marker: THREE.Mesh;
  phase: number;
  journey: {
    curve: THREE.CatmullRomCurve3;
    duration: number;
    elapsed: number;
    returning: boolean;
    resumePhase: number;
  } | null;
  posing: boolean;
  peaceFingers: THREE.Group;
};

const skinTones = ["#c98e6d", "#e6b492", "#865840", "#d7a07f"];
const hairColors = ["#293344", "#594334", "#382e2b", "#443638"];

function createGuest(primitives: ScenePrimitives, palette: ScenePalette, index: number): Guest {
  const group = new THREE.Group();
  group.userData.guestId = index;
  const shirt = [palette.blue, palette.rose, palette.gold, palette.leaf, palette.white, palette.ink][
    index % 6
  ];
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
  primitives.capsule(group, shirt, 0.28, 0.42, [0, 1.35, 0]);
  primitives.sphere(group, skin, [0.24, 0.29, 0.23], [0, 2.02, 0]);
  primitives.sphere(group, hair, [0.25, 0.16, 0.24], [0, 2.18, -0.025]);
  primitives.cylinder(group, skin, 0.09, 0.16, [0, 1.76, 0]);
  for (const x of [-0.085, 0.085])
    primitives.sphere(group, palette.charcoal, [0.023, 0.029, 0.018], [x, 2.045, 0.21]);
  primitives.sphere(group, skin, [0.04, 0.065, 0.055], [0, 1.99, 0.23]);
  primitives.box(group, hair, [0.095, 0.012, 0.012], [0, 1.93, 0.214]);
  const leftArm = limb(-0.36, 1.6, shirt, 0.42, 0.09);
  const rightArm = limb(0.36, 1.6, shirt, 0.42, 0.09);
  primitives.sphere(leftArm, skin, [0.1, 0.12, 0.1], [0, -0.55, 0]);
  primitives.sphere(rightArm, skin, [0.1, 0.12, 0.1], [0, -0.55, 0]);
  const peaceFingers = new THREE.Group();
  for (const direction of [-1, 1]) {
    const finger = primitives.capsule(peaceFingers, skin, 0.026, 0.17, [direction * 0.05, -0.72, 0]);
    finger.rotation.z = direction * 0.28;
  }
  peaceFingers.visible = false;
  rightArm.add(peaceFingers);
  const leftLeg = limb(-0.15, 0.93, trousers, 0.62, 0.1);
  const rightLeg = limb(0.15, 0.93, trousers, 0.62, 0.1);
  primitives.box(leftLeg, hair, [0.21, 0.13, 0.35], [0, -0.78, 0.06]);
  primitives.box(rightLeg, hair, [0.21, 0.13, 0.35], [0, -0.78, 0.06]);
  primitives.shadow(group, 1.4, 1.1);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.47, 0.57, 24),
    new THREE.MeshBasicMaterial({ color: palette.blue, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.035;
  marker.userData.excludeFromPhoto = true;
  group.add(marker);
  // Moving contact shadows follow the actor; only venue furniture uses the
  // shared shadow map, keeping six guests inexpensive on mobile devices.
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  group.scale.setScalar(index % 2 === 0 ? 0.96 : 1.04);
  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    marker,
    phase: index * 0.16,
    journey: null,
    posing: false,
    peaceFingers,
  };
}

function restLimbs(guest: Guest) {
  guest.leftLeg.rotation.x = guest.rightLeg.rotation.x = 0;
  guest.leftArm.rotation.set(0, 0, 0.12);
  guest.rightArm.rotation.set(0, 0, -0.12);
}

/** Explicit photo tasks have their own clock, independent of ambient walking. */
export function createAnimatedGuests(primitives: ScenePrimitives, palette: ScenePalette, count: number) {
  const group = new THREE.Group();
  const route = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-4.7, 0, 0.6),
      new THREE.Vector3(-3.7, 0, 3.7),
      new THREE.Vector3(-0.6, 0, 4.1),
      new THREE.Vector3(4.8, 0, 3.7),
      new THREE.Vector3(5.2, 0, -0.6),
      new THREE.Vector3(3.3, 0, -1.4),
      new THREE.Vector3(-1.7, 0, -1.5),
    ],
    true,
    "centripetal",
  );
  const guests = Array.from({ length: count }, (_, index) => {
    const guest = createGuest(primitives, palette, index);
    group.add(guest.group);
    return guest;
  });
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  let photoGuest: number | null = null;
  let selected = 0;
  let ambientElapsed = 0;
  let visitorMovingUntil = 0;
  const visitorReturnPosition = new THREE.Vector3(-3.4, 0, 2.7);
  guests[VISITOR_GUEST].group.position.copy(visitorReturnPosition);

  function startJourney(guest: Guest, destination: THREE.Vector3, returning: boolean, resumePhase = 0) {
    const origin = guest.group.position.clone().setY(0);
    const direction = origin.x < PHOTO_SPOT.x ? -1 : 1;
    const aisle = new THREE.Vector3(PHOTO_SPOT.x + direction * 1.35, 0, 3.9);
    // Approach from the side aisle, away from the tripod in the center.
    const side = new THREE.Vector3(origin.x < PHOTO_SPOT.x ? -2.2 : 4.5, 0, origin.z);
    const points = returning ? [origin, aisle, destination] : [origin, side, aisle, destination];
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    guest.journey = {
      curve,
      duration: Math.max(0.8, curve.getLength() / 1.7),
      elapsed: 0,
      returning,
      resumePhase,
    };
    guest.posing = false;
  }

  function release() {
    if (photoGuest === null) return;
    const guest = guests[photoGuest];
    const phase = (((guest.phase + ambientElapsed / (46 + photoGuest * 5)) % 1) + 1) % 1;
    route.getPointAt(phase, point);
    startJourney(
      guest,
      photoGuest === VISITOR_GUEST ? visitorReturnPosition.clone() : point.clone(),
      true,
      phase,
    );
    photoGuest = null;
  }

  function update(
    delta: number,
    animateAmbient: boolean,
    reducedMotion: boolean,
    hand: VisitorHand = EMPTY_VISITOR_HAND,
  ) {
    if (animateAmbient && !reducedMotion) ambientElapsed += delta;
    guests.forEach((guest, index) => {
      guest.marker.visible = index === selected;
      let walking = false;
      if (guest.journey) {
        const journey = guest.journey;
        journey.elapsed += delta;
        const progress = reducedMotion ? 1 : Math.min(1, journey.elapsed / journey.duration);
        journey.curve.getPointAt(progress, point);
        journey.curve.getTangentAt(Math.min(0.999, progress), tangent);
        guest.group.position.copy(point);
        guest.group.rotation.y = Math.atan2(tangent.x, tangent.z);
        walking = progress < 1;
        if (!walking) {
          guest.journey = null;
          guest.posing = !journey.returning;
          if (journey.returning) guest.phase = journey.resumePhase - ambientElapsed / (46 + index * 5);
        }
      } else if (!guest.posing && index !== VISITOR_GUEST) {
        const progress = (((guest.phase + ambientElapsed / (46 + index * 5)) % 1) + 1) % 1;
        route.getPointAt(progress, point);
        route.getTangentAt(progress, tangent);
        guest.group.position.copy(point);
        guest.group.rotation.y = Math.atan2(tangent.x, tangent.z);
        walking = animateAmbient && !reducedMotion;
      } else if (index === VISITOR_GUEST && !guest.posing) {
        walking = performance.now() < visitorMovingUntil && !reducedMotion;
      }
      restLimbs(guest);
      guest.peaceFingers.visible = false;
      if (walking) {
        const stride = Math.sin(ambientElapsed * 5 + (guest.journey?.elapsed ?? 0) * 5 + index * 2.2) * 0.34;
        guest.leftLeg.rotation.x = stride;
        guest.rightLeg.rotation.x = -stride;
        guest.leftArm.rotation.x = -stride * 0.7;
        guest.rightArm.rotation.x = stride * 0.7;
      }
      if (guest.posing) {
        guest.group.rotation.y = Math.PI;
        guest.rightArm.rotation.z = -2.35 + (reducedMotion ? 0 : Math.sin(ambientElapsed * 2) * 0.1);
      }
      if (index === VISITOR_GUEST && hand.detected && performance.now() - hand.updatedAt < 450) {
        guest.rightArm.rotation.z = hand.peace ? -2.35 : THREE.MathUtils.lerp(-2.65, -1.1, hand.y);
        guest.peaceFingers.visible = hand.peace;
      }
    });
  }
  update(0, false, false);

  return {
    group,
    update,
    getVisitor() {
      return guests[VISITOR_GUEST].group;
    },
    moveVisitorBy(x: number, z: number) {
      if (photoGuest === VISITOR_GUEST) return;
      const visitor = guests[VISITOR_GUEST];
      visitor.journey = null;
      visitor.posing = false;
      visitor.group.position.x = THREE.MathUtils.clamp(visitor.group.position.x + x, -5.1, 5.1);
      // The shared open aisle keeps the visitor clear of each venue's furniture and booth.
      visitor.group.position.z = THREE.MathUtils.clamp(visitor.group.position.z + z, 1.8, 4.55);
      if (Math.hypot(x, z) > 0.001) visitor.group.rotation.y = Math.atan2(x, z);
      visitorMovingUntil = performance.now() + 180;
    },
    select(index: number) {
      selected = THREE.MathUtils.clamp(index, 0, count - 1);
    },
    sendToBooth(index: number) {
      release();
      photoGuest = THREE.MathUtils.clamp(index, 0, count - 1);
      selected = photoGuest;
      if (photoGuest === VISITOR_GUEST) visitorReturnPosition.copy(guests[photoGuest].group.position);
      startJourney(guests[photoGuest], new THREE.Vector3(PHOTO_SPOT.x, 0, PHOTO_SPOT.z), false);
    },
    hasArrived() {
      return photoGuest !== null && guests[photoGuest].posing;
    },
    hasJourneys() {
      return guests.some((guest) => guest.journey !== null);
    },
    isVisitorMoving() {
      return performance.now() < visitorMovingUntil;
    },
    release,
    /** Only the assigned guest appears in a portrait; restore everyone afterward. */
    isolateForPhoto() {
      const visible = guests.map((guest) => guest.group.visible);
      guests.forEach((guest, index) => {
        guest.group.visible = index === photoGuest;
      });
      return () =>
        guests.forEach((guest, index) => {
          guest.group.visible = visible[index];
        });
    },
    guestAt(object: THREE.Object3D) {
      let current: THREE.Object3D | null = object;
      while (current && current !== group) {
        if (typeof current.userData.guestId === "number") return current.userData.guestId as number;
        current = current.parent;
      }
      return null;
    },
  };
}

export type AnimatedGuests = ReturnType<typeof createAnimatedGuests>;
