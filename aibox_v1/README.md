# AIBOX product profile

The public profile is built from five native Next.js pages for MagicBooth. `/`, `/product`, `/gallery`, `/connect`, and `/playground` render without the content-management service. Other dynamic profile pages can continue to use the CMS through `CONTENT_API_URL`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The development server defaults to port `3001`; the management app uses port `3000`.

The theme follows the operating-system preference on first visit. Use the sun/moon button in the header to switch between light and dark mode.

## Notes

- The navigation follows the Snowglobe reference and includes a keyboard-accessible product disclosure, active page links, and a mobile menu.
- Brand assets come from `public/logo.png`, `public/logow.png`, and `public/bg.png`. Next.js serves responsive optimized images from these originals.
- Home and Product include an animated experience walkthrough with chapter selection, pause, and replay. It starts on request and pauses when outside the viewport or in a background tab. There is no video download or external player.
- Gallery previews six illustrative frame directions with working filters and selection. It does not call an AI image-generation service.
- The Connect form sends enquiries to Formspree form `xyzzypra` and displays submission success or errors beside the button. It keeps the entered details when sending fails.
- Connect also links directly to AIBox's WhatsApp booking number with an Indonesian message template for event type, date, location, and expected guests. Visitors review the message before sending it.
- Motion uses CSS and one section observer, honors reduced-motion settings, and leaves content visible when JavaScript is unavailable. No new runtime dependencies were added for this refresh.
- The Playground loads a procedural Three.js booth and a PixiJS hand-tracking overlay only when its stage enters view. Drag, arrow keys, lighting choices, and supported hand gestures update the scene. The CSS booth remains as a fallback when WebGL is unavailable.
- An on-stage four-step guide responds to rotation, camera permission, and detected hands. Both renderers pause when offscreen or in a hidden tab and honor reduced-motion preferences. Hand control still loads MediaPipe only after the visitor enables the camera.
- The playground requests camera permission immediately after **Enable camera**, before loading the hand tracker. The preview stays available if tracking cannot load, with retry and camera-off controls. Blocked permissions must be changed in the browser's site settings. Camera access requires HTTPS or localhost; an HTTP LAN IP does not qualify.
- Product and event imagery in the profile are concept visuals.
