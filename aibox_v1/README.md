# AIBOX product profile

The public profile is built from five native Next.js pages for MagicBooth. `/`, `/product`, `/gallery`, `/connect`, and `/playground` render without the content-management service. Additional dynamic profile pages can use the CMS when `CMS_ENABLED=true` and `CONTENT_API_URL` is configured.

## Production on Vercel

See [DEPLOYMENT.md](./DEPLOYMENT.md) for `aibox-photo.com` setup. Import `saaka-aibox/companyProfile`, use `aibox_v1` as the Vercel Root Directory, Next.js as the framework, Node.js 22.x, and `main` as the Production Branch. Import [.env.production.example](./.env.production.example) into Vercel's Production and Preview environments before deploying.

The standard scripts use `next dev`, `next build`, and `next start`. Vercel handles the server runtime; `server.ts` is an optional local custom server available through `dev:custom` / `start:custom`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The development server defaults to port `3001`; the management app uses port `3000`.

For a local production build, use `npm run build` followed by `npm run start` (default port `3000`, or set `PORT` in the shell). Environment examples are committed; local `.env` files are ignored.

The theme follows the operating-system preference on first visit. Use the sun/moon button in the header to switch between light and dark mode.

## Notes

- The navigation follows the Snowglobe reference and includes a keyboard-accessible product disclosure, active page links, and a mobile menu.
- Brand assets come from `public/logo.png`, `public/logow.png`, and `public/bg.png`. Next.js serves responsive optimized images from these originals.
- Home and Product include an animated experience walkthrough with chapter selection, pause, and replay. It starts on request and pauses when outside the viewport or in a background tab. There is no video download or external player.
- The homepage photo wall loops continuously with hover/tap review cards, a pause control, and reduced-motion support. Its photos and reviews are labeled as samples. Gallery retains a three-style frame picker and an experience concept photo. It does not call an AI image-generation service.
- The Connect form sends enquiries to Formspree form `xyzzypra` and displays submission success or errors beside the button. It keeps the entered details when sending fails.
- Connect also links directly to AIBox's WhatsApp booking number with an Indonesian message template for event type, date, location, and expected guests. Visitors review the message before sending it.
- Motion honors reduced-motion settings and pauses automatic animations when offscreen or in a hidden tab.
- The Playground loads the supplied `Casing 1.glb` through Three.js and a PixiJS hand-tracking overlay when its stage enters view. Drag, arrow keys, or pinch thumb and index finger to rotate; release to hold the angle. Studio, Wedding, Coffee shop, and Creative launch are native isometric dioramas with animated virtual guests, zoom controls, and light/dark palettes. Scene animation can be paused; reduced-motion renders a still venue. No additional venue downloads or libraries are needed. A product photo is the fallback when WebGL is unavailable.
- An on-stage four-step guide responds to rotation, camera permission, and detected hands. Both renderers pause when offscreen or in a hidden tab and honor reduced-motion preferences. Hand control still loads MediaPipe only after the visitor enables the camera.
- The playground requests camera permission immediately after **Enable camera**, before loading the hand tracker. The preview stays available if tracking cannot load, with retry and camera-off controls. Blocked permissions must be changed in the browser's site settings. Camera access requires HTTPS or localhost; an HTTP LAN IP does not qualify.
- Product and event imagery in the profile are concept visuals.
