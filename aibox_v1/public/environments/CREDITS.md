# Playground venue assets

The panoramas below are Poly Haven assets under CC0. They are compressed, 2048×1024 WebP derivatives of the tonemapped panoramas, served locally. Download metadata: https://api.polyhaven.com/files/{asset_id}. License: https://polyhaven.com/license.

| Website setting | Asset | Creator | Source |
| --- | --- | --- | --- |
| Wedding | Ballroom | Sergej Majboroda | https://polyhaven.com/a/ballroom |
| Coffee shop | Bush Restaurant | Greg Zaal | https://polyhaven.com/a/bush_restaurant |
| Creative launch | Photo Studio Broadway Hall | Sergej Majboroda | https://polyhaven.com/a/photo_studio_broadway_hall |

These are venue previews, not photographs of AIBox installations. The coffee setting uses a restaurant interior, and the launch setting uses a photography studio. Three.js supplies environment reflections and subtle background parallax; PixiJS adds ambient petals, dust, or lights. No stock video clips or third-party animation player are used. Motion stops for reduced-motion preferences or when the playground is offscreen/hidden.

The booth loads the original `public/3d/Casing 1.glb` on demand. The export's `Sree` scale-reference figure is hidden in the viewer; the source file, geometry, and materials are preserved. Drag, keyboard, and landmark-based pinch all control the same pose. Pinch distance is normalized to palm size and uses separate engage/release thresholds to reduce tracking jitter.
