# AIBox experience film

An original, silent 18-second motion advertisement rendered from the supplied AIBox booth image, logo, and existing event concept image. This is animated artwork, not filmed event footage or generative live-action video.

Three six-second chapters match the website controls: wave, create a custom frame, keep the photo. Copy and frame artwork are baked into the film so it also works as a standalone advertisement. The poster and H.264 MP4 are served locally; no player dependency is added to the app.

## Render again

Requires Node.js, Playwright with Chromium, and an FFmpeg build with `libx264`. These are offline authoring tools, not application dependencies.

```powershell
node scripts/advertisement/render.mjs --playwright="C:/path/to/playwright" --ffmpeg="C:/path/to/ffmpeg.exe" --browser="C:/path/to/chrome.exe"
```

Edit the artwork in `film.html`. Render output goes to `public/videos`. Keep chapter boundaries at 0, 6, and 12 seconds, or update the chapter timestamps in `ExperienceWalkthrough.tsx` as well.

Alternatively, replace the `--ffmpeg` argument with `--mediabunny="C:/path/to/mediabunny/dist/bundles/mediabunny.mjs"` to encode an MP4 through Chromium WebCodecs. A Chromium build with H.264 encoding is required. FFmpeg can also produce WebM using `--format=webm`.
