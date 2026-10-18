type Point = readonly [number, number];
type Quad = readonly [Point, Point, Point, Point];
type PhotoSlot = { shot: number; corners: Quad; radius?: number };
export type CaptureFrame = {
  id: string;
  name: string;
  src: string;
  slots: readonly PhotoSlot[];
  overlays: readonly (readonly Point[])[];
};

export const STRIP_SHOT_COUNT = 4;
const WIDTH = 1200;
const HEIGHT = 1800;
const rectangle = (x: number, y: number, width: number, height: number): Quad => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
];

// Coordinates describe photo openings in the original 1200 × 1800 supplied artwork.
// Collage ornaments are restored last, keeping them above the visitor's photos.
export const captureFrames: readonly CaptureFrame[] = [
  {
    id: "songs",
    name: "Songs / photo duo",
    src: "/photostrip/Songs.png",
    slots: [0, 1, 2, 3].flatMap((shot) => [
      { shot, corners: rectangle(44, 87 + shot * 355, 531, 303), radius: 16 },
      { shot, corners: rectangle(628, 87 + shot * 355, 531, 303), radius: 16 },
    ]),
    overlays: [
      [
        [536, 45],
        [580, 34],
        [599, 79],
        [616, 16],
        [651, 23],
        [663, 111],
        [609, 141],
        [544, 129],
      ],
      [
        [1068, 90],
        [1104, 21],
        [1161, 15],
        [1198, 88],
        [1147, 130],
      ],
      [
        [7, 447],
        [37, 413],
        [106, 399],
        [99, 455],
        [64, 482],
        [13, 470],
      ],
      [
        [520, 796],
        [541, 752],
        [580, 728],
        [619, 754],
        [596, 825],
        [541, 849],
        [520, 841],
      ],
      [
        [1022, 750],
        [1033, 677],
        [1200, 693],
        [1200, 901],
        [1068, 842],
      ],
      [
        [0, 1025],
        [55, 1042],
        [95, 1100],
        [96, 1160],
        [59, 1221],
        [0, 1240],
      ],
      [
        [1038, 1113],
        [1063, 1070],
        [1132, 1082],
        [1178, 1065],
        [1200, 1107],
        [1177, 1215],
        [1127, 1200],
        [1060, 1171],
      ],
    ],
  },
  {
    id: "wedding",
    name: "Wedding / golden keepsake",
    src: "/photostrip/Wedding.png",
    slots: [
      {
        shot: 0,
        corners: [
          [190, 166],
          [562, 110],
          [640, 526],
          [248, 592],
        ],
      },
      {
        shot: 1,
        corners: [
          [788, 178],
          [1118, 270],
          [987, 730],
          [647, 643],
        ],
      },
      {
        shot: 2,
        corners: [
          [658, 720],
          [1043, 824],
          [916, 1306],
          [511, 1198],
        ],
      },
      {
        shot: 3,
        corners: [
          [68, 1211],
          [436, 1136],
          [586, 1559],
          [171, 1670],
        ],
      },
    ],
    overlays: [
      [
        [963, 790],
        [1002, 778],
        [1049, 799],
        [1072, 837],
        [1052, 874],
        [1002, 898],
        [965, 867],
        [954, 827],
      ],
      [
        [1046, 244],
        [1085, 249],
        [1087, 307],
        [1073, 322],
        [1056, 306],
      ],
    ],
  },
];

export function captureFrameAspect(frame: CaptureFrame) {
  const [tl, tr, , bl] = frame.slots[0].corners;
  return Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) / Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
}

/** Freeze a mirrored webcam frame synchronously, before any async export work. */
export function captureCameraFrame(video: HTMLVideoElement) {
  const stream = video.srcObject as MediaStream | null;
  if (video.readyState < 2 || !video.videoWidth || !stream?.active || video.paused) {
    throw new Error("Your camera is not ready. Enable it and wait for the live preview.");
  }
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser couldn't create your photo.");
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function polygon(context: CanvasRenderingContext2D, points: readonly Point[]) {
  context.beginPath();
  points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.closePath();
}

function fillOpening(context: CanvasRenderingContext2D, photo: HTMLCanvasElement, slot: PhotoSlot) {
  const [tl, tr, br, bl] = slot.corners;
  const width = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
  const height = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  const crop = document.createElement("canvas");
  crop.width = Math.ceil(width);
  crop.height = Math.ceil(height);
  const cropped = crop.getContext("2d");
  if (!cropped) throw new Error("The photo opening couldn't be prepared.");
  const scale = Math.max(width / photo.width, height / photo.height);
  const sw = width / scale,
    sh = height / scale;
  cropped.drawImage(
    photo,
    (photo.width - sw) / 2,
    (photo.height - sh) / 2,
    sw,
    sh,
    0,
    0,
    crop.width,
    crop.height,
  );
  context.save();
  if (slot.radius) {
    context.beginPath();
    context.roundRect(tl[0], tl[1], width, height, slot.radius);
    context.clip();
    context.drawImage(crop, tl[0], tl[1], width, height);
    context.restore();
    crop.width = crop.height = 0;
    return;
  }
  // One continuous affine image avoids diagonal seams across faces. Clip it to
  // the four-sided opening and cover its bounds in the local print coordinates.
  const horizontal = [tr[0] - tl[0], tr[1] - tl[1]];
  const vertical = [bl[0] - tl[0], bl[1] - tl[1]];
  const determinant = horizontal[0] * vertical[1] - horizontal[1] * vertical[0];
  const corner = [br[0] - tl[0], br[1] - tl[1]];
  const u = (corner[0] * vertical[1] - corner[1] * vertical[0]) / determinant;
  const v = (horizontal[0] * corner[1] - horizontal[1] * corner[0]) / determinant;
  const left = Math.min(0, u),
    top = Math.min(0, v);
  polygon(context, slot.corners);
  context.clip();
  context.transform(horizontal[0], horizontal[1], vertical[0], vertical[1], tl[0], tl[1]);
  context.drawImage(crop, left, top, Math.max(1, u) - left, Math.max(1, v) - top);
  context.restore();
  crop.width = crop.height = 0;
}

export async function composeVisitorPhotostrip(
  artwork: HTMLImageElement,
  frame: CaptureFrame,
  shots: readonly HTMLCanvasElement[],
) {
  if (shots.length !== STRIP_SHOT_COUNT) throw new Error("Take all four photos to finish your photostrip.");
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your photostrip couldn't be created.");
  context.drawImage(artwork, 0, 0, WIDTH, HEIGHT);
  frame.slots.forEach((slot) => fillOpening(context, shots[slot.shot], slot));
  for (const overlay of frame.overlays) {
    context.save();
    polygon(context, overlay);
    context.clip();
    context.drawImage(artwork, 0, 0, WIDTH, HEIGHT);
    context.restore();
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("The PNG couldn't be saved. Please try again.")),
      "image/png",
    ),
  );
  canvas.width = canvas.height = 0;
  return URL.createObjectURL(blob);
}
