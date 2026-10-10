"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { disposeObject, visibleModelBounds } from "./three-resources";
import { BOOTH_LOCATION, createIsometricVenue, type IsometricVenue } from "./isometric-venue";
import { getVenue, type VenueId } from "./venue-presets";
import type { BoothPose } from "./pinch-rotation";

export type ModelStatus = "loading" | "ready" | "error" | "unsupported";
type SceneSettings = { venue: VenueId; accent: string; ambientMotion: boolean; dark: boolean; zoom: number };
type SceneProps = SceneSettings & {
  poseRef: RefObject<BoothPose>;
  onStatus: (status: ModelStatus) => void;
};

const MODEL_URL = "/3d/Casing%201.glb";
const MODEL_HEIGHT = 4.2;
const FRAME_INTERVAL = 1000 / 30;

/** Load the CAD model once. Venue, theme and zoom changes reuse its renderer. */
export function ThreeBoothScene({ poseRef, accent, venue, ambientMotion, dark, zoom, onStatus }: SceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const updateSceneRef = useRef<((settings: SceneSettings) => void) | null>(null);
  const latestRef = useRef({ venue, accent, ambientMotion, dark, zoom });

  useEffect(() => {
    latestRef.current = { venue, accent, ambientMotion, dark, zoom };
    updateSceneRef.current?.(latestRef.current);
  }, [venue, accent, ambientMotion, dark, zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      onStatus("unsupported");
      return;
    }

    let disposed = false;
    const abort = new AbortController();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.className = "playground-three-canvas";
    renderer.domElement.dataset.view = "isometric";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-9, 9, 8, -8, .1, 100);
    camera.position.set(16, 17, 16);
    camera.lookAt(0, 1, 0);
    const booth = new THREE.Group();
    booth.position.set(BOOTH_LOCATION.x, MODEL_HEIGHT / 2 + .055, BOOTH_LOCATION.z);
    scene.add(booth);

    const hemisphere = new THREE.HemisphereLight(0xf0f5ff, 0x9babc1, 1.7);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-5, 9, 7);
    const rim = new THREE.DirectionalLight(latestRef.current.accent, .65);
    rim.position.set(5, 4, -4);
    scene.add(hemisphere, key, rim);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = .45;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let venueScene: IsometricVenue | null = null;
    let currentSettings: SceneSettings | null = null;
    let elapsed = 0;
    let lastFrame = 0;
    let inView = true;
    let contextLost = false;

    function draw(delta = 0) {
      if (disposed || contextLost) return;
      const pose = poseRef.current;
      const smoothing = motionQuery.matches ? 1 : 1 - Math.exp(-12 * Math.max(delta, 1 / 60));
      booth.rotation.y = THREE.MathUtils.lerp(booth.rotation.y, THREE.MathUtils.degToRad(pose.x), smoothing);
      booth.rotation.x = THREE.MathUtils.lerp(booth.rotation.x, THREE.MathUtils.degToRad(pose.y), smoothing);
      if (!motionQuery.matches && currentSettings?.ambientMotion) {
        elapsed += delta;
        venueScene?.update(elapsed);
      }
      renderer.render(scene, camera);
    }

    function animate(time: number) {
      if (time - lastFrame < FRAME_INTERVAL) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, .1) : 0;
      lastFrame = time;
      draw(delta);
    }

    function syncAnimation() {
      lastFrame = 0;
      // The low-rate loop also smooths input while the guests are paused.
      const active = inView && !document.hidden && !motionQuery.matches && !contextLost;
      renderer.setAnimationLoop(active ? animate : null);
      if (inView && !document.hidden) draw();
    }

    function updateScene(settings: SceneSettings) {
      if (settings.venue !== currentSettings?.venue || settings.dark !== currentSettings?.dark) {
        if (venueScene) {
          scene.remove(venueScene.group);
          disposeObject(venueScene.group);
        }
        venueScene = createIsometricVenue(settings.venue, settings.dark);
        scene.add(venueScene.group);
        scene.background = new THREE.Color(venueScene.palette.background);
        hemisphere.intensity = 1.7;
        key.intensity = settings.dark ? 2 : 2.2;
        key.color.set(getVenue(settings.venue).light);
        elapsed = 0;
        renderer.domElement.dataset.venue = settings.venue;
      }
      rim.color.set(settings.accent);
      camera.zoom = settings.zoom;
      camera.updateProjectionMatrix();
      currentSettings = settings;
      draw();
    }
    updateSceneRef.current = updateScene;

    function resize() {
      const width = Math.max(1, host!.clientWidth);
      const height = Math.max(1, host!.clientHeight);
      const aspect = width / height;
      const viewHeight = Math.max(15, 19.5 / aspect);
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    }

    onStatus("loading");
    void (async () => {
      let model: THREE.Group | undefined;
      try {
        const response = await fetch(MODEL_URL, { signal: abort.signal });
        if (!response.ok) throw new Error("Model download failed");
        const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/3d/");
        model = gltf.scene;
        if (disposed) { disposeObject(model); return; }
        // Hide the CAD scale figure. Animated guests belong to the venue instead.
        const scaleFigure = model.getObjectByName("Sree");
        if (scaleFigure) scaleFigure.visible = false;
        const bounds = visibleModelBounds(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (bounds.isEmpty() || size.y < .001) throw new Error("Model has no visible booth geometry");
        const scale = MODEL_HEIGHT / size.y;
        model.scale.setScalar(scale);
        model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
        booth.add(model);
        renderer.domElement.dataset.model = "casing-1";
        draw();
        onStatus("ready");
      } catch {
        if (model && !booth.children.includes(model)) disposeObject(model);
        if (!disposed) onStatus("error");
      }
    })();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncAnimation();
    }, { threshold: .05 });
    visibilityObserver.observe(host);
    const onPose = () => { if (motionQuery.matches && inView) draw(); };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      renderer.setAnimationLoop(null);
      onStatus("unsupported");
    };
    host.parentElement?.addEventListener("aibox:pose", onPose);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", syncAnimation);
    motionQuery.addEventListener("change", syncAnimation);
    updateScene(latestRef.current);
    resize();
    syncAnimation();

    return () => {
      disposed = true;
      abort.abort();
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      host.parentElement?.removeEventListener("aibox:pose", onPose);
      document.removeEventListener("visibilitychange", syncAnimation);
      motionQuery.removeEventListener("change", syncAnimation);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      updateSceneRef.current = null;
      disposeObject(scene);
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onStatus, poseRef]);

  return <div ref={hostRef} className="playground-three" aria-hidden="true" />;
}
