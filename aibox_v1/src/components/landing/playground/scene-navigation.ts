import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { BoothPose } from "./pinch-rotation";
import type { InteractionMode } from "./playground-types";

const INITIAL_POSITION = new THREE.Vector3(16, 17, 16);
const INITIAL_TARGET = new THREE.Vector3(0, 1, 0);

/** Mouse/touch, keyboard, and hand input all manipulate the same scene camera. */
export function createSceneNavigation(
  camera: THREE.OrthographicCamera,
  canvas: HTMLCanvasElement,
  onChange: () => void,
) {
  camera.position.copy(INITIAL_POSITION);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(INITIAL_TARGET);
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.4;
  controls.screenSpacePanning = false;
  controls.maxTargetRadius = 7;
  controls.rotateSpeed = 0.7;
  controls.update();
  controls.saveState();
  const initialPolar = controls.getPolarAngle();
  const initialAzimuth = controls.getAzimuthalAngle();
  controls.addEventListener("change", onChange);

  return {
    configure(mode: InteractionMode) {
      controls.enabled = mode !== "booth" && mode !== "guest";
      controls.mouseButtons.LEFT = mode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.touches.ONE = mode === "pan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    },
    getOrbitPose(): BoothPose {
      return {
        x: THREE.MathUtils.radToDeg(controls.getAzimuthalAngle() - initialAzimuth),
        y: THREE.MathUtils.radToDeg(controls.getPolarAngle() - initialPolar),
      };
    },
    orbitTo(pose: BoothPose) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta = initialAzimuth + THREE.MathUtils.degToRad(pose.x);
      spherical.phi = THREE.MathUtils.clamp(
        initialPolar + THREE.MathUtils.degToRad(pose.y),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
    },
    panBy(x: number, y: number) {
      // Horizontal view axes projected onto the floor keep panning grounded.
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).setY(0).normalize();
      const forward = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();
      const shift = right.multiplyScalar(x * 0.015).add(forward.multiplyScalar(y * 0.015));
      camera.position.add(shift);
      controls.target.add(shift);
      controls.update();
    },
    zoomBy(amount: number) {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom + amount, controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
      controls.update();
      onChange();
    },
    resetView() {
      controls.reset();
    },
    dispose() {
      controls.removeEventListener("change", onChange);
      controls.dispose();
    },
  };
}
