import * as THREE from "three";

/** Shares the existing webcam stream with a small billboard above Guest 06. */
export function createVisitorBadge(video: HTMLVideoElement, ink: string, paper: string) {
  const group = new THREE.Group();
  group.userData.excludeFromPhoto = true;
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Mirror the badge to match both the preview and the downloaded photo.
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  const portrait = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.84),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, depthTest: false }),
  );
  portrait.position.y = 0.25;
  portrait.renderOrder = 9;
  group.add(portrait);
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 80;
  const context = canvas.getContext("2d")!;
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = ink;
  context.font = "600 29px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("YOU / GUEST 06", 192, 40);
  const labelTexture = new THREE.CanvasTexture(canvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.29),
    new THREE.MeshBasicMaterial({ map: labelTexture, toneMapped: false, depthTest: false }),
  );
  label.position.y = -0.36;
  label.renderOrder = 10;
  group.add(label);
  return {
    group,
    update(camera: THREE.Camera, avatar: THREE.Object3D, cameraActive: boolean) {
      group.position.copy(avatar.position);
      group.position.y += 3.25;
      group.quaternion.copy(camera.quaternion);
      portrait.visible = cameraActive && video.readyState >= 2 && !video.paused;
      if (video.videoWidth && video.videoHeight) {
        portrait.scale.x = video.videoWidth / video.videoHeight / (4 / 3);
      }
    },
  };
}
