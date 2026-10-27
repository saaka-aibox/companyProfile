import type { AiStyle } from "../../../lib/room/protocol";

export const AI_STYLE_META: Record<AiStyle, { name: string; blurb: string; swatch: string }> = {
  ghibli: { name: "Studio Ghibli", blurb: "Soft hand-painted skies and gentle colour.", swatch: "linear-gradient(135deg,#9fd8c0,#f5e6a8 55%,#8fc1f0)" },
  pixar: { name: "Pixar 3D", blurb: "Glossy, expressive 3D animation look.", swatch: "linear-gradient(135deg,#ffb36b,#ff6f91 55%,#6c8cff)" },
  retro90s: { name: "Retro 90s", blurb: "Flash-bulb grain and loud mall-photo colour.", swatch: "linear-gradient(135deg,#ff4fa3,#ffe14d 50%,#31d6ff)" },
  cyberpunk: { name: "Cyberpunk Neon", blurb: "Rainy night, magenta and cyan glow.", swatch: "linear-gradient(135deg,#1a0b3b,#ff2bd6 55%,#00e5ff)" },
  manga: { name: "Manga B&W", blurb: "Inked lines and screentone shading.", swatch: "linear-gradient(135deg,#ffffff,#9a9a9a 55%,#111111)" },
  oil: { name: "Oil painting", blurb: "Thick brushwork and warm gallery light.", swatch: "linear-gradient(135deg,#7a4a22,#d9a441 55%,#2f5d62)" },
};

export const AI_STYLE_ORDER: AiStyle[] = ["ghibli", "pixar", "retro90s", "cyberpunk", "manga", "oil"];
