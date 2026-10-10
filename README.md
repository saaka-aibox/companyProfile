# AIBox Company Profile

AIBox's company and product website, with an interactive photobooth Playground.

Repository: [saaka-aibox/companyProfile](https://github.com/saaka-aibox/companyProfile).
Production domain: **https://aibox-photo.com**.

## Applications

| Directory | Application |
| --- | --- |
| `aibox_v1` | Public Next.js website: Home, Product, Gallery, Connect and Playground |
| `manage_compro` | Separate CMS/admin application; not required for the public website |

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
