import * as THREE from "three";

/** One small palette for the entire diorama, including its night view. */
export function scenePalette(dark: boolean) {
  return {
    background: dark ? "#141e2c" : "#eaf0f7",
    floor: dark ? "#293649" : "#faf9f4",
    edge: dark ? "#1e2a3c" : "#cbd8e7",
    wall: dark ? "#344156" : "#e6eaf0",
    white: dark ? "#b9c8db" : "#ffffff",
    ink: dark ? "#d6e5f5" : "#283c56",
    line: dark ? "#465973" : "#d2dde8",
    blue: "#386cda",
    blueSoft: dark ? "#304d76" : "#c5d8f1",
    wood: dark ? "#8d705b" : "#cfac83",
    leaf: dark ? "#4f8877" : "#7da894",
    leafLight: dark ? "#6e9b84" : "#a6c3a3",
    rose: dark ? "#bd8998" : "#e9bdc6",
    gold: "#e6b365",
    glass: dark ? "#4e728a" : "#aacbd9",
    light: "#fff1ca",
    metal: dark ? "#8091a3" : "#657787",
    charcoal: "#263344",
    linen: dark ? "#b9ada1" : "#f5ecdf",
  };
}

export type ScenePalette = ReturnType<typeof scenePalette>;
type Surface = "plain" | "wood" | "stone" | "fabric" | "plaster" | "metal" | "glass";

/** Shared primitive geometry/materials keep the venue light and easy to dispose. */
export class ScenePrimitives {
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly textures = new Map<Surface, THREE.CanvasTexture>();
  private readonly shadowMaterial: THREE.MeshBasicMaterial;

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 32);
    gradient.addColorStop(0, "rgba(23,40,62,.24)");
    gradient.addColorStop(1, "rgba(23,40,62,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    });
  }

  private geometry(key: string, create: () => THREE.BufferGeometry) {
    if (!this.geometries.has(key)) this.geometries.set(key, create());
    return this.geometries.get(key)!;
  }

  /** Tiny surface maps add grain without downloading texture packs. */
  private texture(surface: Surface) {
    if (this.textures.has(surface)) return this.textures.get(surface)!;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 128; index++) {
      const shade = 228 + Math.floor((((Math.sin(index * 12.9898) * 43758.5453) % 1) + 1) * 10);
      context.fillStyle = `rgb(${shade},${shade},${shade})`;
      if (surface === "wood") context.fillRect(index, 0, 1, 128);
      else if (surface === "fabric") {
        context.fillRect(index * 2, 0, 1, 128);
        context.fillRect(0, index * 2, 128, 1);
      } else {
        for (let column = 0; column < 128; column += 4) context.fillRect(column, index, 2, 1);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    this.textures.set(surface, texture);
    return texture;
  }

  private mesh(geometry: THREE.BufferGeometry, color: string, surface: Surface = "plain") {
    const key = `${color}:${surface}`;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: surface === "metal" ? 0.32 : 0.78,
          metalness: surface === "metal" ? 0.65 : 0.02,
          map: ["wood", "stone", "fabric", "plaster"].includes(surface) ? this.texture(surface) : null,
          transparent: surface === "glass",
          opacity: surface === "glass" ? 0.32 : 1,
          depthWrite: surface !== "glass",
        }),
      );
    }
    const mesh = new THREE.Mesh(geometry, this.materials.get(key)!);
    mesh.castShadow = surface !== "glass";
    mesh.receiveShadow = true;
    return mesh;
  }

  box(
    parent: THREE.Object3D,
    color: string,
    size: [number, number, number],
    position: [number, number, number],
    surface: Surface = "plain",
  ) {
    const mesh = this.mesh(
      this.geometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
      color,
      surface,
    );
    mesh.scale.set(...size);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  cylinder(
    parent: THREE.Object3D,
    color: string,
    radius: number,
    height: number,
    position: [number, number, number],
    surface: Surface = "plain",
  ) {
    const mesh = this.mesh(
      this.geometry("cylinder", () => new THREE.CylinderGeometry(1, 1, 1, 16)),
      color,
      surface,
    );
    mesh.scale.set(radius, height, radius);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  sphere(
    parent: THREE.Object3D,
    color: string,
    size: [number, number, number],
    position: [number, number, number],
  ) {
    const mesh = this.mesh(
      this.geometry("sphere", () => new THREE.SphereGeometry(1, 12, 8)),
      color,
    );
    mesh.scale.set(...size);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  capsule(
    parent: THREE.Object3D,
    color: string,
    radius: number,
    length: number,
    position: [number, number, number],
  ) {
    const key = `capsule:${radius}:${length}`;
    const mesh = this.mesh(
      this.geometry(key, () => new THREE.CapsuleGeometry(radius, length, 3, 8)),
      color,
    );
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  slab(parent: THREE.Object3D, color: string, width: number, depth: number, height: number, y: number) {
    const radius = 0.28;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -depth / 2);
    shape.lineTo(width / 2 - radius, -depth / 2);
    shape.quadraticCurveTo(width / 2, -depth / 2, width / 2, -depth / 2 + radius);
    shape.lineTo(width / 2, depth / 2 - radius);
    shape.quadraticCurveTo(width / 2, depth / 2, width / 2 - radius, depth / 2);
    shape.lineTo(-width / 2 + radius, depth / 2);
    shape.quadraticCurveTo(-width / 2, depth / 2, -width / 2, depth / 2 - radius);
    shape.lineTo(-width / 2, -depth / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -depth / 2, -width / 2 + radius, -depth / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 5,
    });
    geometry.rotateX(-Math.PI / 2);
    const mesh = this.mesh(geometry, color, "stone");
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  }

  shadow(parent: THREE.Object3D, width: number, depth: number, x = 0, z = 0) {
    const mesh = new THREE.Mesh(
      this.geometry("plane", () => new THREE.PlaneGeometry(1, 1)),
      this.shadowMaterial,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(width, depth, 1);
    mesh.position.set(x, 0.025, z);
    parent.add(mesh);
    return mesh;
  }

  panel(
    parent: THREE.Object3D,
    color: string,
    width: number,
    height: number,
    position: [number, number, number],
    surface: Surface = "plain",
  ) {
    const mesh = this.mesh(new THREE.PlaneGeometry(width, height), color, surface);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  label(
    parent: THREE.Object3D,
    text: string,
    color: string,
    background: string,
    width: number,
    height: number,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = background;
    context.fillRect(0, 0, 512, 128);
    context.fillStyle = color;
    context.font = "500 32px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
    parent.add(mesh);
    return mesh;
  }
}
