"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { disposeObject, visibleModelBounds } from "./three-resources";
import { createIsometricVenue, type IsometricVenue } from "./isometric-venue";
import { BOOTH_LOCATION, MODEL_HEIGHT } from "./booth-layout";
import { createFixedBooth } from "./fixed-booth";
import { createSceneNavigation } from "./scene-navigation";
import { captureBoothPhoto } from "./booth-photo";
import { createPhotoSession, type PhotoSession } from "./photo-session";
import { getVenue, type VenueId } from "./venue-presets";
import type { BoothPose } from "./pinch-rotation";
import type {
  BoothKind,
  InteractionMode,
  ModelStatus,
  PhotoTask,
  SceneController,
  ScenePhoto,
} from "./playground-types";

type SceneSettings = {
  venue: VenueId;
  boothKind: BoothKind;
  selectedGuest: number;
  interactionMode: InteractionMode;
  accent: string;
  ambientMotion: boolean;
  dark: boolean;
};
type SceneProps = SceneSettings & {
  poseRef: RefObject<BoothPose>;
  controllerRef: RefObject<SceneController | null>;
  onStatus: (status: ModelStatus) => void;
  onGuestSelect: (guest: number) => void;
  onTask: (task: PhotoTask) => void;
  onPhoto: (photo: ScenePhoto) => void;
};

const MODEL_URL = "/3d/Casing%201.glb";
const FRAME_INTERVAL = 1000 / 30;

/** The renderer and CAD model live once; controls and venue updates reuse them. */
export function ThreeBoothScene({
  poseRef,
  controllerRef,
  onStatus,
  onGuestSelect,
  onTask,
  onPhoto,
  ...settings
}: SceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const updateSceneRef = useRef<((settings: SceneSettings) => void) | null>(null);
  const latestRef = useRef(settings);
  const callbacksRef = useRef({ onStatus, onGuestSelect, onTask, onPhoto });
  const { venue, boothKind, selectedGuest, interactionMode, accent, ambientMotion, dark } = settings;

  useEffect(() => {
    callbacksRef.current = { onStatus, onGuestSelect, onTask, onPhoto };
  }, [onStatus, onGuestSelect, onTask, onPhoto]);
  useEffect(() => {
    latestRef.current = { venue, boothKind, selectedGuest, interactionMode, accent, ambientMotion, dark };
    updateSceneRef.current?.(latestRef.current);
  }, [venue, boothKind, selectedGuest, interactionMode, accent, ambientMotion, dark]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      callbacksRef.current.onStatus("unsupported");
      return;
    }
    let disposed = false;
    let contextLost = false;
    let inView = true;
    let animationRunning = false;
    let lastFrame = 0;
    let elapsed = 0;
    let modelStatus: ModelStatus = "loading";
    let venueScene: IsometricVenue | null = null;
    let fixedBooth: ReturnType<typeof createFixedBooth> | null = null;
    let photoSession: PhotoSession | null = null;
    let currentSettings: SceneSettings | null = null;
    const abort = new AbortController();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "playground-three-canvas";
    renderer.domElement.dataset.view = "orbit";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-9, 9, 8, -8, 0.1, 100);
    const booth = new THREE.Group();
    booth.position.set(BOOTH_LOCATION.x, MODEL_HEIGHT / 2 + 0.055, BOOTH_LOCATION.z);
    scene.add(booth);
    const hemisphere = new THREE.HemisphereLight(0xf0f5ff, 0x9babc1, 1.7);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-5, 10, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -10;
    key.shadow.camera.right = key.shadow.camera.top = 10;
    key.shadow.normalBias = 0.035;
    key.shadow.bias = -0.0002;
    const rim = new THREE.DirectionalLight(latestRef.current.accent, 0.45);
    rim.position.set(5, 4, -4);
    scene.add(hemisphere, key, rim);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.4;

    function draw(delta = 0) {
      if (disposed || contextLost) return;
      const pose = poseRef.current;
      const smoothing = motionQuery.matches ? 1 : 1 - Math.exp(-12 * Math.max(delta, 1 / 60));
      booth.rotation.y = THREE.MathUtils.lerp(booth.rotation.y, THREE.MathUtils.degToRad(pose.x), smoothing);
      booth.rotation.x = THREE.MathUtils.lerp(booth.rotation.x, THREE.MathUtils.degToRad(pose.y), smoothing);
      const ambient = Boolean(currentSettings?.ambientMotion) && !motionQuery.matches;
      if (ambient) elapsed += delta;
      venueScene?.guests.update(delta, ambient, motionQuery.matches);
      if (ambient) fixedBooth?.update(elapsed);
      photoSession?.update(delta);
      renderer.render(scene, camera);
    }

    const navigation = createSceneNavigation(camera, renderer.domElement, () => {
      // Ambient frames run at 30 fps; reduced motion still responds to explicit input.
      if (motionQuery.matches || !animationRunning) draw();
    });

    function animate(time: number) {
      if (time - lastFrame < FRAME_INTERVAL) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.1) : 0;
      lastFrame = time;
      draw(delta);
      if (!animationNeeded()) {
        animationRunning = false;
        renderer.setAnimationLoop(null);
      }
    }

    function animationNeeded() {
      if (!inView || document.hidden || contextLost) return false;
      const taskActive = photoSession?.task.phase === "walking" || photoSession?.task.phase === "countdown";
      const pose = poseRef.current;
      const boothMoving =
        Math.abs(booth.rotation.y - THREE.MathUtils.degToRad(pose.x)) > 0.001 ||
        Math.abs(booth.rotation.x - THREE.MathUtils.degToRad(pose.y)) > 0.001;
      return (
        taskActive ||
        (!motionQuery.matches &&
          (Boolean(currentSettings?.ambientMotion) ||
            Boolean(venueScene?.guests.hasJourneys()) ||
            boothMoving))
      );
    }

    function syncAnimation() {
      lastFrame = 0;
      const active = animationNeeded();
      animationRunning = active;
      renderer.setAnimationLoop(active ? animate : null);
      if (inView && !document.hidden) draw();
    }

    function reportStatus() {
      callbacksRef.current.onStatus(
        contextLost ? "unsupported" : currentSettings?.boothKind === "fixed" ? "ready" : modelStatus,
      );
    }

    function capture(guest: number) {
      if (!venueScene || !currentSettings || contextLost) throw new Error("Scene unavailable");
      const restoreGuests = venueScene.guests.isolateForPhoto();
      const hidden: THREE.Object3D[] = [];
      const boothWasVisible = booth.visible;
      booth.visible = false; // The virtual lens sits inside its casing.
      scene.traverse((object) => {
        if (object.userData.excludeFromPhoto && object.visible) {
          hidden.push(object);
          object.visible = false;
        }
      });
      try {
        callbacksRef.current.onPhoto({
          src: captureBoothPhoto(renderer, scene, currentSettings.venue, guest),
          venue: currentSettings.venue,
          guest,
        });
      } finally {
        hidden.forEach((object) => {
          object.visible = true;
        });
        booth.visible = boothWasVisible;
        restoreGuests();
      }
    }

    function updateScene(next: SceneSettings) {
      const rebuild = next.venue !== currentSettings?.venue || next.dark !== currentSettings?.dark;
      if (rebuild) {
        photoSession?.cancel();
        if (venueScene) {
          scene.remove(venueScene.group);
          disposeObject(venueScene.group);
        }
        if (fixedBooth) {
          scene.remove(fixedBooth.group);
          disposeObject(fixedBooth.group);
        }
        venueScene = createIsometricVenue(next.venue, next.dark);
        fixedBooth = createFixedBooth(next.dark);
        scene.add(venueScene.group, fixedBooth.group);
        scene.background = new THREE.Color(venueScene.palette.background);
        key.intensity = next.dark ? 2 : 2.2;
        key.color.set(getVenue(next.venue).light);
        elapsed = 0;
        photoSession = createPhotoSession(
          venueScene.guests,
          (task) => {
            callbacksRef.current.onTask(task);
            // Stop the reduced-motion task loop after arrival or capture.
            queueMicrotask(() => {
              if (!disposed) syncAnimation();
            });
          },
          capture,
        );
        renderer.domElement.dataset.venue = next.venue;
      } else if (
        next.boothKind !== currentSettings?.boothKind ||
        next.selectedGuest !== currentSettings?.selectedGuest
      ) {
        photoSession?.cancel();
      }
      venueScene?.guests.select(next.selectedGuest);
      booth.visible = next.boothKind === "portable";
      if (fixedBooth) fixedBooth.group.visible = next.boothKind === "fixed";
      navigation.configure(next.interactionMode);
      rim.color.set(next.accent);
      currentSettings = next;
      renderer.domElement.dataset.booth = next.boothKind;
      reportStatus();
      draw();
      syncAnimation();
    }
    updateSceneRef.current = updateScene;
    controllerRef.current = {
      getOrbitPose: navigation.getOrbitPose,
      orbitTo: navigation.orbitTo,
      panBy: navigation.panBy,
      zoomBy: navigation.zoomBy,
      resetView() {
        poseRef.current = { x: 0, y: 0 };
        navigation.resetView();
        draw();
      },
      sendGuest() {
        if (modelStatus !== "ready" || currentSettings?.boothKind !== "portable") return;
        poseRef.current = { x: 0, y: 0 };
        photoSession?.send(currentSettings.selectedGuest);
        syncAnimation();
      },
      captureGuest() {
        if (currentSettings?.boothKind !== "portable" || modelStatus !== "ready") return;
        photoSession?.capture();
        syncAnimation();
      },
      cancelTask() {
        photoSession?.cancel();
        syncAnimation();
      },
    };

    function resize() {
      const width = Math.max(1, host!.clientWidth);
      const height = Math.max(1, host!.clientHeight);
      const aspect = width / height;
      const viewHeight = Math.max(15, 19.5 / aspect);
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    }

    void (async () => {
      let model: THREE.Group | undefined;
      try {
        const response = await fetch(MODEL_URL, { signal: abort.signal });
        if (!response.ok) throw new Error("Model download failed");
        const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/3d/");
        model = gltf.scene;
        if (disposed) {
          disposeObject(model);
          return;
        }
        const scaleFigure = model.getObjectByName("Sree");
        if (scaleFigure) scaleFigure.visible = false;
        const bounds = visibleModelBounds(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (bounds.isEmpty() || size.y < 0.001) throw new Error("Model has no visible booth geometry");
        const scale = MODEL_HEIGHT / size.y;
        model.scale.setScalar(scale);
        model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        booth.add(model);
        modelStatus = "ready";
        renderer.domElement.dataset.model = "casing-1";
        draw();
        reportStatus();
      } catch {
        if (model && !booth.children.includes(model)) disposeObject(model);
        if (!disposed) {
          modelStatus = "error";
          reportStatus();
        }
      }
    })();

    // A click selects a guest. A drag continues to orbit/pan through OrbitControls.
    const raycaster = new THREE.Raycaster();
    let pointerStart: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = pointerStart;
      pointerStart = null;
      if (
        !start ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5 ||
        !venueScene ||
        currentSettings?.boothKind !== "portable"
      )
        return;
      if (photoSession?.task.phase === "walking" || photoSession?.task.phase === "countdown") return;
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObject(venueScene.guests.group, true)[0];
      const guest = hit ? venueScene.guests.guestAt(hit.object) : null;
      if (guest !== null) callbacksRef.current.onGuestSelect(guest);
    };
    const onPointerCancel = () => {
      pointerStart = null;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncAnimation();
      },
      { threshold: 0.05 },
    );
    visibilityObserver.observe(host);
    const onPose = () => {
      if (inView && !document.hidden && !animationRunning) syncAnimation();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      animationRunning = false;
      renderer.setAnimationLoop(null);
      photoSession?.cancel();
      controllerRef.current = null;
      reportStatus();
    };
    host.parentElement?.addEventListener("aibox:pose", onPose);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", syncAnimation);
    motionQuery.addEventListener("change", syncAnimation);
    updateScene(latestRef.current);
    resize();

    return () => {
      disposed = true;
      abort.abort();
      renderer.setAnimationLoop(null);
      controllerRef.current = null;
      updateSceneRef.current = null;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      navigation.dispose();
      host.parentElement?.removeEventListener("aibox:pose", onPose);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", syncAnimation);
      motionQuery.removeEventListener("change", syncAnimation);
      disposeObject(scene);
      key.shadow.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [poseRef, controllerRef]);

  return <div ref={hostRef} className="playground-three" aria-hidden="true" />;
}
