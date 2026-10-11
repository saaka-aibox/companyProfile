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
- The same transparent `public/logo.png` is used in both themes. A small SVG filter in `Brand.tsx` makes only its white lettering navy in light mode, preserving the blue/orange accents and original dark-mode artwork. Product backgrounds come from `public/bg.png`. Next.js serves responsive optimized images from these originals.
- Selected labels, feature cards, gallery/enquiry panels, and primary actions have neo-brutalist accents in `src/app/profile-accents.css`. Decorative flash, lens, and print motifs share `PhotoOrnament.tsx`; they are inline SVGs without additional dependencies. The existing page composition and imagery remain in place, and the accents adapt to light/dark and reduced-motion preferences.
- Home and Product include an animated experience walkthrough with chapter selection, pause, and replay. It starts on request and pauses when outside the viewport or in a background tab. There is no video download or external player.
- The homepage photo wall loops through the supplied designs in `public/photostrip/`, showing the full 2:3 artwork with hover/tap review cards, a pause control, and reduced-motion support. Reviews remain labeled as samples until approved customer quotes are added to `src/components/landing/profile/photostrip-moments.ts`. Gallery uses the same catalog in a thumbnail picker with full artwork previews, alongside an experience concept photo. It does not call an AI image-generation service.
- The Connect form sends enquiries to Formspree form `xyzzypra` and displays submission success or errors beside the button. It keeps the entered details when sending fails.
- Connect reads its booking number from `WHATSAPP_NUMBER` (currently `085759040420`) and converts the local Indonesian prefix to the international format for WhatsApp. The chat opens with an Indonesian message template for event type, date, location, and expected guests. Visitors review the message before sending it. Configure the variable in Vercel and redeploy when it changes.
- Motion honors reduced-motion settings and pauses automatic animations when offscreen or in a hidden tab.
- The Playground offers Portable (the supplied `Casing 1.glb`) and Fixed (an animated coming-soon concept volume). The booth selector replaces the previous light-signature swatches. Studio, Wedding, Coffee shop, and Creative launch have cutaway architecture, furnishings, small procedural surface maps, soft shadows, and animated virtual guests. No venue asset downloads or additional libraries are needed.
- OrbitControls moves the whole venue camera: drag to orbit, shift/right-drag to pan, wheel or two-finger gestures to zoom. Pan scene and Turn booth modes, keyboard arrows, zoom buttons, and Home/reset are available. Pinch controls follow the selected mode to orbit, pan, or rotate the portable box.
- Click a virtual guest or choose one in the controls, then Send to booth. The guest walks to the photo spot and poses. Take photo starts a three-second countdown and renders a portrait from a dedicated virtual booth camera, with a venue-specific AIBox frame. The local PNG can be enlarged and downloaded; it depicts a simulated guest, not the visitor's webcam or an AI-generated portrait. Fixed booth photo tasks remain unavailable until that product is ready.
- Guest photo tasks run independently of paused background guests. Switching venues, booth types, or the light/dark site theme cancels an in-progress task. Reduced-motion skips guest travel animation, but explicit photo countdowns still work. Both renderers pause offscreen or in a hidden tab, and MediaPipe loads only after the visitor enables optional hand control.
- The playground requests camera permission immediately after **Enable camera**, before loading the hand tracker. The preview stays available if tracking cannot load, with retry and camera-off controls. Blocked permissions must be changed in the browser's site settings. Camera access requires HTTPS or localhost; an HTTP LAN IP does not qualify.
- Product and event imagery in the profile are concept visuals.
