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
- The homepage photo wall continuously loops through the supplied designs in `public/photostrip/`, showing the full 2:3 artwork. Drag left/right with a mouse or touch to explore; automatic motion resumes on release. Hover/tap still flips reviews while the loop moves, and dragging does not trigger a card click. There is no pause/resume button. Keyboard focus and reduced-motion preferences retain accessible motion handling. Reviews remain labeled as samples until approved customer quotes are added to `src/components/landing/profile/photostrip-moments.ts`. Gallery uses the same catalog in a thumbnail picker with full artwork previews, alongside an experience concept photo. It does not call an AI image-generation service.
- The Connect form sends enquiries to Formspree form `xyzzypra` and displays submission success or errors beside the button. It keeps the entered details when sending fails.
- Connect reads its booking number from `WHATSAPP_NUMBER` (currently `085759040420`) and converts the local Indonesian prefix to the international format for WhatsApp. The chat opens with an Indonesian message template for event type, date, location, and expected guests. Visitors review the message before sending it. Configure the variable in Vercel and redeploy when it changes.
- Motion honors reduced-motion settings and pauses automatic animations when offscreen or in a hidden tab.
- The Playground offers Portable (the supplied `Casing 1.glb`) and Fixed (an animated coming-soon concept volume). The booth selector replaces the previous light-signature swatches. Studio, Wedding, Coffee shop, and Creative launch have cutaway architecture, furnishings, small procedural surface maps, soft shadows, and animated virtual guests. No venue asset downloads or additional libraries are needed.
- OrbitControls moves the whole venue camera: drag to orbit, shift/right-drag to pan, wheel or two-finger gestures to zoom. Pan scene and Turn booth modes, keyboard arrows, zoom buttons, and Home/reset are available. Pinch controls follow the selected mode to orbit, pan, or rotate the portable box.
- Every venue has five virtual guests and Guest 06, labelled **You**. Guest 06 starts selected. Enable the camera in the studio below the scene; the same stream supplies hand tracking, the mirrored preview, a live badge above your avatar, and your camera photos. No additional camera request or upload is used.
- In **Move You**, pinch thumb and index finger and move your hand to walk Guest 06 through the open aisle. Drag or arrow keys also move the avatar. **Orbit scene**, **Pan scene**, and **Turn booth** remain separate view controls. Your avatar's raised hand responds to the tracked hand and peace pose.
- Choose **Songs** or **Wedding**, then **Go to photo spot** (or thumbs up). After the avatar arrives, hold a confident peace sign for half a second to start a three-second countdown. Keep the peace sign visible until the shutter. Lower your hand before the next shot. Repeat for four new photos; there is no manual shutter for Guest 06. Progress, countdown, permission guidance, and errors are shown beside the live preview.
- The camera session composes a 1200 × 1800 PNG using the supplied `public/photostrip/Songs.png` or `Wedding.png`. Typed photo-opening coordinates in `visitor-photostrip.ts` replace the artwork's sample photos with the four camera frames and preserve surrounding decorations. Songs repeats the four photos in its two print columns. Preview, download, clear, and a new session are available; temporary canvases and replaced object URLs are released.
- Guests 01–05 still use **Send to booth** and **Take photo** for simulated portraits from the dedicated virtual booth camera, with venue-specific frames. Fixed booth photo tasks remain unavailable until that product is ready.
- Photo tasks run independently of paused background guests. Switching venues, guests, booth types, frames, or the light/dark theme cancels an unfinished visitor session. Turning off or disconnecting the camera, losing hand tracking, or hiding the tab also cancels it. Reduced-motion skips guest travel animation, while explicit countdowns still work. Offscreen WebGL rendering pauses, but explicit guest journeys/countdowns can finish while using the camera studio below the scene. MediaPipe loads only after camera permission is granted.
- The playground requests camera permission immediately after **Enable camera**, before loading the hand tracker. The preview stays available if tracking cannot load, with retry and camera-off controls. Blocked permissions must be changed in the browser's site settings. Camera access requires HTTPS or localhost; an HTTP LAN IP does not qualify.
- Product and event imagery in the profile are concept visuals.
