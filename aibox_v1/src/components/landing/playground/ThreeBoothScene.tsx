"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GroundedSkybox } from "three/addons/objects/GroundedSkybox.js";
import { disposeObject, visibleModelBounds } from "./three-resources";
import { getVenue, type VenueId } from "./venue-presets";
import type { BoothPose } from "./pinch-rotation";

export type ModelStatus = "loading" | "ready" | "error" | "unsupported";
type SceneProps = {
  poseRef: RefObject<BoothPose>;
  accent: string;
  venue: VenueId;
  ambientMotion: boolean;
  onStatus: (status: ModelStatus) => void;
};

const MODEL_URL = "/3d/Casing%201.glb";
const MODEL_HEIGHT = 4.6;

function createContactShadow() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.65)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = -MODEL_HEIGHT / 2 + .01;
  return mesh;
}

/** Load the supplied CAD export once. Venue changes reuse the same model and renderer. */
export function ThreeBoothScene({ poseRef, accent, venue, ambientMotion, onStatus }: SceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const updateSceneRef = useRef<((venue: VenueId, accent: string, motion: boolean) => void) | null>(null);
  const latestRef = useRef({ venue, accent, ambientMotion });

  useEffect(() => {
    latestRef.current = { venue, accent, ambientMotion };
    updateSceneRef.current?.(venue, accent, ambientMotion);
  }, [venue, accent, ambientMotion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch { onStatus("unsupported"); return; }

    let disposed = false;
    const abort = new AbortController();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = "playground-three-canvas";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    const booth = new THREE.Group(); scene.add(booth);
    const shadow = createContactShadow(); if (shadow) scene.add(shadow);
    const hemisphere = new THREE.HemisphereLight(0xe9f2ff, 0x514535, 1.8); scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 6, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0x73c9ff, 1.4); rim.position.set(4, 2, -3); scene.add(rim);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const studioEnvironment = pmrem.fromScene(room, .04);
    room.dispose();
    scene.environment = studioEnvironment.texture;
    scene.environmentIntensity = .7;

    const textureLoader = new THREE.TextureLoader();
    const venues = new Map<string, Promise<{ texture: THREE.Texture; environment: THREE.WebGLRenderTarget }>>();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentVenue = getVenue(latestRef.current.venue);
    let motionEnabled = latestRef.current.ambientMotion;
    let inView = true, venueRequest = 0, elapsed = 0, lastFrame = 0;
    let modelWidth = 2, modelDepth = 1.5;
    let skybox: GroundedSkybox | null = null;

    const draw = (delta = 0) => {
      const pose = poseRef.current;
      const smoothing = motionQuery.matches ? 1 : 1 - Math.exp(-12 * Math.max(delta, 1 / 60));
      booth.rotation.y = THREE.MathUtils.lerp(booth.rotation.y, THREE.MathUtils.degToRad(pose.x), smoothing);
      booth.rotation.x = THREE.MathUtils.lerp(booth.rotation.x, THREE.MathUtils.degToRad(pose.y), smoothing);
      if (!motionQuery.matches && motionEnabled) elapsed += delta;
      const drift = !motionQuery.matches && motionEnabled ? Math.sin(elapsed * .15) * .018 : 0;
      scene.backgroundRotation.y = currentVenue.rotation + drift + THREE.MathUtils.degToRad(pose.x) * .025;
      scene.environmentRotation.y = scene.backgroundRotation.y;
      if (skybox) skybox.rotation.y = scene.backgroundRotation.y;
      renderer.render(scene, camera);
    };
    const animate = (time: number) => {
      if (time - lastFrame < 1000 / 30) return;
      const delta = Math.min((time - lastFrame) / 1000, .1); lastFrame = time;
      draw(delta);
    };
    const syncAnimation = () => {
      // A short render loop also smooths pointer/hand input when ambient motion is off.
      renderer.setAnimationLoop(inView && !document.hidden && !motionQuery.matches ? animate : null);
      if (inView && !document.hidden) draw();
    };

    async function updateScene(id: VenueId, nextAccent: string, motion: boolean) {
      currentVenue = getVenue(id); motionEnabled = motion; rim.color.set(nextAccent); key.color.set(currentVenue.light);
      const request = ++venueRequest;
      if (!currentVenue.image) {
        if (skybox) skybox.visible = false;
        scene.background = null; scene.environment = studioEnvironment.texture; scene.backgroundIntensity = 1;
        draw(); return;
      }
      const image = currentVenue.image;
      if (!venues.has(image)) {
        venues.set(image, textureLoader.loadAsync(image).then(texture => {
          if (disposed) { texture.dispose(); throw new Error("Scene disposed"); }
          texture.colorSpace = THREE.SRGBColorSpace; texture.mapping = THREE.EquirectangularReflectionMapping;
          return { texture, environment: pmrem.fromEquirectangular(texture) };
        }));
      }
      try {
        const asset = await venues.get(image)!;
        if (disposed || request !== venueRequest) return;
        if (!skybox) {
          skybox = new GroundedSkybox(asset.texture, 4.2, 55, 32);
          skybox.position.y = 4.2 - MODEL_HEIGHT / 2;
          skybox.material.color.setScalar(.85);
          scene.add(skybox);
        } else { skybox.material.map = asset.texture; skybox.material.needsUpdate = true; }
        skybox.visible = true;
        scene.background = null; scene.environment = asset.environment.texture;
        draw();
      } catch {
        venues.delete(image);
        if (!disposed && request === venueRequest) { if (skybox) skybox.visible = false; scene.background = null; scene.environment = studioEnvironment.texture; draw(); }
      }
    }
    updateSceneRef.current = (id, nextAccent, motion) => { void updateScene(id, nextAccent, motion); };

    function resize() {
      const width = Math.max(1, host!.clientWidth), height = Math.max(1, host!.clientHeight);
      camera.aspect = width / height;
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const distance = Math.max(MODEL_HEIGHT / (2 * Math.tan(verticalFov / 2)), Math.max(modelWidth, modelDepth) / (2 * Math.tan(horizontalFov / 2))) * 1.4;
      camera.position.set(0, .25, distance); camera.lookAt(0, -.1, 0);
      camera.updateProjectionMatrix(); renderer.setSize(width, height, false); draw();
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
        // This export includes a person for scale. Keep its resources in the scene for cleanup.
        const scaleFigure = model.getObjectByName("Sree"); if (scaleFigure) scaleFigure.visible = false;
        const bounds = visibleModelBounds(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (bounds.isEmpty() || size.y < .001) throw new Error("Model has no visible booth geometry");
        const scale = MODEL_HEIGHT / size.y;
        model.scale.setScalar(scale); model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
        modelWidth = size.x * scale; modelDepth = size.z * scale;
        booth.add(model); renderer.domElement.dataset.model = "casing-1";
        resize(); onStatus("ready");
      } catch {
        if (model && !booth.children.includes(model)) disposeObject(model);
        if (!disposed) onStatus("error");
      }
    })();

    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncAnimation(); }, { threshold: .05 });
    visibilityObserver.observe(host);
    const onPose = () => { if (motionQuery.matches && inView) draw(); };
    const onContextLost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); onStatus("unsupported"); };
    host.parentElement?.addEventListener("aibox:pose", onPose);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", syncAnimation); motionQuery.addEventListener("change", syncAnimation);
    resize(); syncAnimation();
    void updateScene(latestRef.current.venue, latestRef.current.accent, latestRef.current.ambientMotion);

    return () => {
      disposed = true; abort.abort(); renderer.setAnimationLoop(null);
      resizeObserver.disconnect(); visibilityObserver.disconnect();
      host.parentElement?.removeEventListener("aibox:pose", onPose);
      document.removeEventListener("visibilitychange", syncAnimation); motionQuery.removeEventListener("change", syncAnimation);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      updateSceneRef.current = null;
      // Venue textures belong to the cache; avoid disposing them through the skybox too.
      if (skybox) skybox.material.map = null;
      disposeObject(scene); studioEnvironment.dispose();
      venues.forEach(asset => { void asset.then(({ texture, environment }) => { texture.dispose(); environment.dispose(); }).catch(() => {}); });
      pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [onStatus, poseRef]);

  return <div ref={hostRef} className="playground-three" aria-hidden="true" />;
}
