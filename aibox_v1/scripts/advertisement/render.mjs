import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Offline production tool; none of these rendering tools ship with the website.
const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
if (!args.playwright || (!args.ffmpeg && !args.mediabunny)) throw new Error('Supply --playwright=<module path> and either --ffmpeg=<executable path> or --mediabunny=<browser bundle>. Optional: --browser=<Chromium path>.');
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(args.playwright));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'public/videos');
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/mediabunny.mjs' && args.mediabunny) {
    try { response.setHeader('Content-Type', 'text/javascript'); response.end(await readFile(resolve(args.mediabunny))); }
    catch { response.writeHead(404).end(); }
    return;
  }
  const file = pathname === '/' ? resolve(root, 'scripts/advertisement/film.html') : resolve(root, 'public', `.${pathname}`);
  const publicPath = relative(resolve(root, 'public'), file);
  if (pathname !== '/' && (publicPath.startsWith('..') || isAbsolute(publicPath))) {
    response.writeHead(403).end(); return;
  }
  try {
    const types = { '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp' };
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await mkdir(output, { recursive: true });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
let browser;
let encoder;
try {
  browser = await chromium.launch({ headless: true, ...(args.browser ? { executablePath: args.browser } : {}) });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => window.ready);
  const poster = await page.evaluate(() => window.renderFrame(.8));
  await writeFile(resolve(output, 'aibox-experience-poster.jpg'), Buffer.from(poster, 'base64'));
  if (args.mediabunny) {
    await page.evaluate(async () => {
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource } = await import('/mediabunny.mjs');
      window.output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
      window.videoSource = new CanvasSource(document.querySelector('canvas'), { codec: 'avc', bitrate: 1_200_000 });
      window.output.addVideoTrack(window.videoSource, { frameRate: 24 });
      await window.output.start();
    });
    for (let frame = 0; frame < 18 * 24; frame++) {
      await page.evaluate(async frame => {
        window.renderFrame(frame / 24);
        await window.videoSource.add(frame / 24, 1 / 24, { keyFrame: frame % 24 === 0 });
      }, frame);
      if (frame % 72 === 0) console.log(`Rendering ${Math.round(frame / (18 * 24) * 100)}%`);
    }
    const data = await page.evaluate(async () => {
      await window.output.finalize();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(new Blob([window.output.target.buffer]));
      });
    });
    await writeFile(resolve(output, 'aibox-experience.mp4'), Buffer.from(data, 'base64'));
    console.log(`Created ${resolve(output, 'aibox-experience.mp4')}`);
  } else {
    const webm = args.format === 'webm';
    const fileName = `aibox-experience.${webm ? 'webm' : 'mp4'}`;
    const encoding = webm ? ['-c:v', 'libvpx', '-b:v', '1800k', '-crf', '12', '-deadline', 'good']
      : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    encoder = spawn(args.ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', '24', '-vcodec', 'mjpeg', '-i', 'pipe:0',
      '-an', ...encoding, resolve(output, fileName)], { stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderError = '';
    encoder.stderr.on('data', chunk => { encoderError += chunk; });
    const finished = once(encoder, 'close');
    encoder.stdin.on('error', () => {});
    for (let frame = 0; frame < 18 * 24; frame++) {
      const jpeg = await page.evaluate(time => window.renderFrame(time), frame / 24);
      if (encoder.exitCode !== null) throw new Error(encoderError);
      if (!encoder.stdin.write(Buffer.from(jpeg, 'base64'))) await once(encoder.stdin, 'drain');
      if (frame % 72 === 0) console.log(`Rendering ${Math.round(frame / (18 * 24) * 100)}%`);
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(encoderError);
    console.log(`Created ${resolve(output, fileName)}`);
  }
} finally {
  encoder?.kill();
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
