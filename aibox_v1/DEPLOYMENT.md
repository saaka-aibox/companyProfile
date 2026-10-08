# Deploy AIBox to Vercel

Production origin: **https://aibox-photo.com**.

Deploy the native public website in `aibox_v1`. The `manage_compro` application is a separate CMS and is not required for the five public pages. This deployment uses standard Next.js hosting, browser-based MediaPipe hand tracking, local Three.js/PixiJS assets, and Formspree enquiries.

## 1. Import the GitHub repository

Import `saakaaibox/compro` in Vercel and use these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `aibox_v1` |
| Framework Preset | Next.js |
| Node.js | `22.x` (also pinned in `package.json`) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Framework default; leave Override off |
| Production Branch | `ardit_dev`, which contains the current website |

If your Vercel project was imported from `main`, open **Settings → Environments → Production → Branch Tracking** and select `ardit_dev` before publishing this version. Keep the repository's two apps in separate Vercel projects if you deploy the CMS later.

Vercel reads the app's `vercel.json` after Root Directory is set. A catch-all rewrite to `/` is unnecessary: Next.js handles the five pages, API routes, image optimization, and 404s.

Sources: [Build settings](https://vercel.com/docs/builds/configure-a-build), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Production Branch](https://vercel.com/docs/git#production-branch).

## 2. Set environment variables before building

Copy the active values in `.env.production.example` into **Settings → Environment Variables**, or import that file in Vercel. Select **Production** and **Preview**. They contain configuration, not private credentials.

```dotenv
SITE_URL=https://aibox-photo.com
CMS_ENABLED=false
LOCAL_GESTURE_BRIDGE_ENABLED=false
NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/xyzzypra
```

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Production canonical links, social URLs, robots, and sitemap |
| `CMS_ENABLED` | Keep CMS pages and management endpoints disabled for the native profile |
| `LOCAL_GESTURE_BRIDGE_ENABLED` | Disable the desktop Python controller; browser Playground gestures stay available |
| `NEXT_PUBLIC_FORMSPREE_ENDPOINT` | Public endpoint used by the Connect form |

Keep `SITE_URL` pointed at the production domain in Preview too. Vercel Preview builds receive `noindex` metadata and a robots rule disallowing crawling. Vercel supplies `VERCEL` and `VERCEL_ENV`; do not create them manually. No database, OpenAI API key, Python executable, or CMS URL is needed for this public website.

`NEXT_PUBLIC_` values are embedded at build time. Redeploy after changing the form endpoint or deployment environment. Existing local `.env.local` files are not uploaded by Git; Vercel uses values from its project settings. `.env.production.local` is prepared for local production use and stays ignored. Next.js gives `.env.local` higher priority than `.env.production.local`; shell/project environment variables take priority over both.

Source: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables).

## 3. Connect the custom domain

After the first deployment, open **Settings → Domains**:

1. Add `aibox-photo.com` to this Vercel project and attach it to Production.
2. Add `www.aibox-photo.com` and configure it to redirect to `aibox-photo.com`.
3. Use the exact DNS records displayed by Vercel. If the domain uses Vercel nameservers, manage its records there; otherwise update the DNS provider currently hosting the domain. Records can differ by project, so do not copy an old example IP address.
4. Wait for Vercel to show a valid domain configuration and issue HTTPS. The Playground camera needs HTTPS.

Adding a domain does not create a mailbox. The site's existing contact address remains `contact@aibox.id`; update it only when a replacement mailbox is ready.

Source: [Add and configure a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## 4. Confirm the published website

Once Vercel reports the deployment and domain as ready, open:

- `/`, `/product`, `/gallery`, `/connect`, `/playground`
- `/robots.txt` and `/sitemap.xml` (production URLs should use `aibox-photo.com`)
- A nonexistent page (should return 404 without a localhost CMS fetch)

Check the home photo loop, card reviews, Gallery frame picker, theme toggle, product walkthrough, and GLB venue preview. On `/playground`, select Enable camera and approve browser permission. Hand tracking downloads its MediaPipe runtime/model when enabled and runs on the visitor's device. If that download is blocked, the camera preview and drag/keyboard controls remain available.

Confirm the Formspree form is active and its destination email is verified. If you configured Formspree domain restrictions, allow the production domain. A live form check sends an actual enquiry. WhatsApp opens the booking chat for `+6285759040420`.

Source: [Formspree domain restrictions](https://help.formspree.io/articles/form-and-project-settings/restrict-to-domain/).

The `/api/gesture/start` and `/api/gesture/stop` desktop bridge endpoints return 503 when disabled. The `/preview` and `/api/revalidate` CMS endpoints return 404 while CMS is disabled. These endpoints are not used by the native Playground or contact form.

## Optional CMS integration later

Deploy the management app independently, then set `CMS_ENABLED=true`, `CONTENT_API_URL` to its public HTTPS `/api/v1` endpoint, and unique `PREVIEW_SECRET` / `REVALIDATE_SECRET` values in Vercel. Those server-only secrets must not have a `NEXT_PUBLIC_` prefix. Preview and revalidation reject requests when their secret is missing.

Generate each optional secret separately, for example:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

The Python desktop controller remains disabled on Vercel even if its flag is set to true. It requires a separately running desktop and physical camera; visitors use the native browser Playground instead.
