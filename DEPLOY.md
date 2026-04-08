# Deploy Zyra

One-click deploy to Vercel (free):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sonoxo/zyra)

## Or via CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login (opens browser)
vercel login

# Deploy
cd zyra-landing
vercel --prod
```

## Environment Variables Needed:

```
DATABASE_URL=postgresql://...
JWT_SECRET=<generate-secure-string>
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-app.vercel.app
```

## Alternative: GitHub Pages

The `out/` folder contains static build. Push to `gh-pages` branch for auto-deploy.