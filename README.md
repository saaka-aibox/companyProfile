# AIBox Company Profile

AIBox's company and product website, with an interactive photobooth Playground.

Repository: [saaka-aibox/companyProfile](https://github.com/saaka-aibox/companyProfile).
Production domain: **https://aibox-photo.com**.

## Applications

| Directory | Application |
| --- | --- |
| `aibox_v1` | Public Next.js website: Home, Product, Gallery, Connect and Playground |
| `manage_compro` | Separate CMS/admin application; not required for the public website |
| `room_hub` | Node service for AI Box Room (paid online photobox, up to 4 devices) and AI hand-game rooms: orders/Tripay, WebSocket signaling + clock sync, presigned storage, fal.ai jobs. Runs on a VPS, not Vercel. See `room_hub/README.md` and `room_hub/CONTRACT.md` |

## Deploy to Vercel

Import this repository and configure:

- **Production branch:** `main`
- **Root Directory:** `aibox_v1`
- **Framework:** Next.js
- **Node.js:** `22.x`
- **Install:** `npm ci`
- **Build:** `npm run build`
- **Output Directory:** framework default

Import [aibox_v1/.env.production.example](./aibox_v1/.env.production.example) into Vercel's Production and Preview environments. Local environment files and secrets are ignored by Git.

After deployment, add `aibox-photo.com` in the project's domain settings and configure the DNS records shown by Vercel.

See [the deployment guide](./aibox_v1/DEPLOYMENT.md) for environment variables, domain configuration and production checks.

## Run locally

```powershell
cd aibox_v1
npm ci
Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:3001**. The native public pages run without a CMS or database.

## AI Box Room and Games (local)

```powershell
cd room_hub; npm install; npm run dev   # http://localhost:3011 (mock payment, local storage, mock AI)
cd ../aibox_v1; npm run dev            # http://localhost:3001 -> /room and /games
```

Set `NEXT_PUBLIC_ROOM_HUB_URL` in `aibox_v1` when the hub runs elsewhere.
