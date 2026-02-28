# Deployment Guide — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Overview

MyGGV GPS is deployed on **Netlify** as a static SPA. The deployment is fully automated via Netlify CI/CD triggered by git pushes.

---

## Infrastructure

| Component | Service | Config |
|---|---|---|
| Hosting + CDN | Netlify | `netlify.toml` |
| Build system | Netlify CI (via Bun) | `bun run build:netlify` |
| Database | Supabase (managed PostgreSQL + PostGIS) | Env vars |
| Map tiles | OpenFreeMap (free, no key) | Hardcoded URL |
| Routing API | OSRM (free, public) | Hardcoded URL |
| Routing fallback | OpenRouteService | `VITE_OPENROUTE_API_KEY` env var |

---

## Netlify Configuration (`netlify.toml`)

```toml
[build]
  publish = "dist"
  command = "bun run build:netlify"

# SPA: all routes serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers for all routes
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(self), camera=(), microphone=()"

# 1-year immutable cache for hashed assets
[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/markers/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Build Process

### Build Command
```bash
bun run build:netlify
# = bun run lint && vite build
```

**Steps:**
1. ESLint validates all `.js` and `.jsx` files (fails build if errors)
2. Vite builds with optimizations:
   - `console.*` and `debugger` stripped (esbuild)
   - CSS split per chunk
   - Manual chunks: vendor, maps, supabase, animations
   - Target: `esnext` (modern smartphones)
3. Output: `dist/` directory

### Output Structure
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js          # React + App + hooks (~121 KB gzipped)
│   ├── index-[hash].css         # Main stylesheet
│   ├── vendor-[hash].js         # React + ReactDOM
│   ├── maps-[hash].js           # MapLibre GL (~264 KB gzipped)
│   ├── supabase-[hash].js       # Supabase client (~50 KB)
│   └── animations-[hash].js     # Framer Motion (~30 KB)
└── [public/ contents copied]    # icons, fonts, manifest, sw.js
```

---

## Environment Variables

Set these in **Netlify UI → Site settings → Environment variables**:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | **Yes** | Supabase anon/publishable key |
| `VITE_OPENROUTE_API_KEY` | No | ORS routing API key (routing level 2 fallback) |

> **Important:** These are `VITE_`-prefixed variables, inlined at build time by Vite. They are NOT runtime secrets — they will be visible in the client bundle.

---

## Deployment Steps

### Initial Setup (first deploy)

1. **Create Netlify site** linked to the GitHub repository
2. **Configure build settings:**
   - Build command: `bun run build:netlify`
   - Publish directory: `dist`
   - Node version: 20.x (set via Netlify UI or `.node-version` file)
3. **Add environment variables** in Netlify UI (see table above)
4. **Trigger first deploy** via git push to main branch

### Ongoing Deployments

Every push to `main` triggers an automatic Netlify deployment:
```bash
git push origin main
# → Netlify picks up push
# → Runs: bun run build:netlify
# → Deploys dist/ to CDN
# → Available at: https://myggvgps.charlesbourgault.com/
```

### Release Deployments

Use release scripts for versioned deployments:
```bash
bun run release:patch  # Bug fix → v2.2.3 → v2.2.4
bun run release:minor  # New feature → v2.2.3 → v2.3.0
bun run release:major  # Breaking change → v2.2.3 → v3.0.0
```

Each command: bumps `package.json` version, commits, creates git tag, pushes branch + tag.

---

## PWA Configuration

### Web App Manifest (`public/manifest.json`)
- Enables "Add to Home Screen" on iOS/Android
- Configures app name, icons, theme color (#50AA61 green)
- Display mode: standalone (full-screen, no browser chrome)

### Service Worker (`public/sw.js`)
- Registered in `main.jsx` with silent fail (not critical)
- Provides optional asset caching for offline use
- Version: tied to app build

---

## Caching Strategy

| Asset | Cache-Control | Strategy |
|---|---|---|
| `/assets/*` (JS/CSS) | `max-age=31536000, immutable` | 1 year — content-hashed filenames |
| `/icons/*` | `max-age=31536000, immutable` | 1 year — rarely change |
| `/markers/*` | `max-age=31536000, immutable` | 1 year |
| `index.html` | No cache header (Netlify default) | Always fresh |
| Map tiles | Browser default | OpenFreeMap CDN handles this |

---

## Monitoring & Debugging Production

### Check build logs
```
Netlify UI → Deploys → [latest deploy] → Deploy log
```

### Common production issues

| Issue | Diagnosis | Fix |
|---|---|---|
| Blank white screen | CSP blocking resources | Check browser console for CSP errors |
| Map not loading | CORS or tile server down | Check Network tab → tiles.openfreemap.org |
| Supabase error | Missing/wrong env var | Check Netlify env vars, redeploy |
| GPS not working | Browser permission denied | User must enable in browser settings |
| Old version served | Browser/CDN cache | Force refresh (Ctrl+Shift+R), or clear cache |

### Force redeploy without code changes
```
Netlify UI → Deploys → Trigger deploy → Deploy site
```

---

## Security Considerations

- **API keys in client bundle:** `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` is the public anon key — designed to be public. Enable Row Level Security (RLS) on Supabase tables to restrict access.
- **CSP headers:** Defined in `index.html` meta tag (app-level) AND via `_headers` in `public/` (Netlify-level). Both should be kept in sync.
- **Permissions-Policy:** Restricts geolocation to `self` only — prevents iframe abuse.
- **X-Frame-Options: DENY:** Prevents clickjacking.
