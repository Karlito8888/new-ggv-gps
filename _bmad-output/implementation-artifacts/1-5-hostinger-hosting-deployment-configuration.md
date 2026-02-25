# Story 1.5: Hostinger Hosting Deployment & Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any visitor scanning the QR code at the village entrance,
I want the app to be served from a reliable paid hosting provider,
So that I never encounter blank pages or failed loads from free tier limitations.

## Acceptance Criteria

1. **Given** the `dist/` folder has been built via `bun run build` **When** it is deployed to Hostinger **Then** the app is accessible via HTTPS at the production domain **And** SSL/TLS is active (Let's Encrypt via hPanel)

2. **Given** a user navigates directly to the app URL **When** Hostinger serves the request **Then** the SPA redirect is configured (all routes → `/index.html` via `.htaccess`) so the React app loads correctly

3. **Given** the Hostinger `.htaccess` is configured **When** HTTP response headers are inspected **Then** the following security headers are present: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`, `Referrer-Policy: strict-origin-when-cross-origin`

4. **Given** assets are deployed to Hostinger **When** `/assets/*`, `/icons/*`, `/markers/*`, `/fonts/*`, `/style/*`, `/tiles/*`, `/map-fonts/*`, and `/sprites/*` are requested **Then** the response includes `Cache-Control: public, max-age=31536000, immutable`

5. **Given** the Hostinger server supports HTTP/2 **When** the PMTiles file is requested via HTTP range request **Then** range requests are served correctly, enabling efficient tile extraction by the PMTiles protocol handler

6. **Given** the full deployment is live (stories 1.1-1.4 in place) **When** the app is tested on a real Android device on Slow 3G (Chrome DevTools throttle) **Then** first paint occurs in under 3 seconds (NFR1) and the interactive map becomes usable in under 5 seconds (NFR2) **And** all existing navigation features work without regression (FR1-FR4, FR6-FR22, FR33-FR34)

## Tasks / Subtasks

- [x] Task 1: Create `public/.htaccess` for Hostinger (AC: #2, #3, #4, #5)
  - [x] 1.1 Create `.htaccess` with HTTP→HTTPS redirect (RewriteCond %{HTTPS} off + X-Forwarded-Proto fallback for LiteSpeed proxy)
  - [x] 1.2 Add SPA redirect rules: RewriteEngine On, serve existing files/dirs as-is, fallback everything else to `/index.html` with `Options -MultiViews`
  - [x] 1.3 Add security headers via `Header set`: X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Permissions-Policy (geolocation=(self)), Referrer-Policy strict-origin-when-cross-origin
  - [x] 1.4 Add HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (commented out, ready to enable after SSL confirmation)
  - [x] 1.5 Add long-term Cache-Control for static assets via `<FilesMatch>` by extension: `.js`, `.css`, `.woff2`, `.png`, `.webp`, `.svg`, `.ico`, `.pbf`, `.pmtiles`, `.json` → `public, max-age=31536000, immutable`
  - [x] 1.6 Override Cache-Control for HTML files → `no-cache` (always fresh for SW update detection)
  - [x] 1.7 Override Cache-Control for `sw.js` → `no-store, no-cache` (Service Worker must never be cached by HTTP cache)
  - [x] 1.8 Add MIME type declarations: `AddType application/x-protobuf .pbf`, `AddType application/vnd.pmtiles .pmtiles`
  - [x] 1.9 Disable gzip on `.pmtiles` files (incompatible with range requests): `RewriteRule [E=no-gzip:1]` (LiteSpeed-compatible method)
  - [x] 1.10 Compression: documented that LiteSpeed Enterprise has native GZIP/Brotli enabled by default (mod_deflate not used)

- [x] Task 2: Remove Netlify-specific files (AC: #1)
  - [x] 2.1 Delete `public/_headers` (Netlify-specific headers file — replaced by .htaccess)
  - [x] 2.2 Delete `public/_redirects` (Netlify-specific redirects — replaced by .htaccess)
  - [x] 2.3 Keep `netlify.toml` for now — added deprecation comment at top of file

- [x] Task 3: Update deployment documentation (AC: #1)
  - [x] 3.1 Update `CLAUDE.md` Deployment section: added Hostinger as primary alongside Netlify (deprecated), noted `.htaccess` for SPA redirect + security headers + cache
  - [x] 3.2 Added deployment note: Phase 1 uses manual FTP/SSH upload of `dist/` folder; Phase 3 will automate via GitHub Actions

- [x] Task 4: Build verification and deployment test (AC: #1, #6)
  - [x] 4.1 `bun run lint` — zero errors
  - [x] 4.2 `bun run build` — zero errors, `dist/.htaccess` confirmed present in build output
  - [ ] 4.3 Deploy `dist/` to Hostinger via FTP/SSH (manual upload) — **requires manual action by Charles**
  - [ ] 4.4 Verify HTTPS active on production domain (SSL certificate valid) — **requires deployed site**
  - [ ] 4.5 Verify SPA redirect: navigate to a non-root URL path → app loads (not 404) — **requires deployed site**
  - [ ] 4.6 Verify security headers present in HTTP response (use `curl -I` or browser DevTools Network) — **requires deployed site**
  - [ ] 4.7 Verify Cache-Control headers on static assets (`/assets/*.js`, `/tiles/ggv.pmtiles`, `/map-fonts/**/*.pbf`) — **requires deployed site**
  - [ ] 4.8 Verify PMTiles range requests work: map renders village tiles at all zoom levels z12-z18 — **requires deployed site**
  - [ ] 4.9 Verify `sw.js` Cache-Control is `no-store` (critical for SW update mechanism) — **requires deployed site**
  - [ ] 4.10 Full regression test on Android device: GPS permission → block selection → lot selection → navigation → arrival → exit village — **requires device test**
  - [ ] 4.11 Test offline mode: enable airplane mode after initial load → verify map + navigation work from cache — **requires device test**
  - [ ] 4.12 Performance test on Slow 3G: first paint < 3s (NFR1), interactive map < 5s (NFR2) — **requires device test**

## Dev Notes

### Critical Architecture Constraints

- **Phase 1 = JavaScript only.** Do NOT rename any files to .ts/.tsx. No TypeScript in this story.
- **Hostinger uses LiteSpeed Enterprise, NOT Apache.** LiteSpeed reads `.htaccess` with Apache compatibility, but `<IfModule>` conditions are often ignored (directives execute regardless). Write them anyway for documentation value but don't rely on them for conditional behavior.
- **No source code changes.** This story creates `public/.htaccess` and removes Netlify-specific files. Zero changes to `src/`, hooks, App.jsx, or vite.config.js.
- **No changes to `src/sw.js` or Service Worker.** The SW from Story 1.3 handles all runtime caching. The `.htaccess` handles HTTP-level caching (what the browser/CDN sees before the SW intercepts).
- **Manual deployment for Phase 1.** Upload `dist/` folder to Hostinger via FTP/SSH. No CI/CD pipeline yet (that's Story 3.4).
- **Keep `netlify.toml` during transition.** The file stays until DNS is fully cut over to Hostinger. Add a comment noting it's deprecated.
- **Vite copies `public/` contents to `dist/` automatically.** `public/.htaccess` → `dist/.htaccess` happens at build time. No build config changes needed.

### Hostinger Technical Intelligence (LiteSpeed Enterprise)

- **Server:** LiteSpeed Enterprise (not Apache) — reads `.htaccess` with Apache mod compatibility
- **mod_rewrite:** Active by default, fully supported
- **mod_headers:** Supported on LiteSpeed Enterprise (use `Header always set`, not `expr=` syntax)
- **mod_deflate / gzip:** Enabled by default
- **mod_expires:** Unreliable on LiteSpeed — use `mod_headers` with `Cache-Control` instead
- **Range requests:** Supported natively for static files (no config needed). PMTiles HTTP range requests work out of the box
- **`<IfModule>` behavior:** LiteSpeed ignores the condition — directives inside always execute
- **HSTS warning:** Do NOT enable `Strict-Transport-Security` until SSL is confirmed working on the domain. Adding HSTS prematurely can lock users out for `max-age` duration
- **CORS:** Not needed for same-origin SPA. All assets (tiles, fonts, style, JS) served from same domain
- **PMTiles + gzip conflict:** Dynamic gzip compression on `.pmtiles` breaks range requests. Must exclude `.pmtiles` from gzip. The SW handles caching; HTTP-level caching is secondary
- **HTTP→HTTPS redirect:** Use both `%{HTTPS} off` and `%{HTTP:X-Forwarded-Proto} =http` conditions to handle LiteSpeed's reverse proxy architecture

### .htaccess Structure (Implementation Guide)

The `.htaccess` file should follow this exact order:

```
1. HTTPS redirect (RewriteEngine + conditions)
2. SPA fallback redirect (RewriteRule for index.html)
3. Security headers (Header always set)
4. HSTS (separate, added only after SSL validation)
5. MIME types (AddType)
6. Cache-Control by file extension (FilesMatch)
7. Cache-Control overrides for HTML and sw.js
8. Compression (deflate)
9. PMTiles gzip exclusion
```

### Netlify → Hostinger Header Mapping

| Netlify (`netlify.toml`) | Hostinger (`.htaccess`) |
|---|---|
| `[[headers]] for = "/*"` security headers | `Header always set X-Frame-Options "DENY"` etc. |
| `[[headers]] for = "/assets/*"` cache | `<FilesMatch "\.(js\|css)$">` Cache-Control |
| `[[headers]] for = "/icons/*"` cache | `<FilesMatch "\.(png\|webp\|ico)$">` Cache-Control |
| `[[headers]] for = "/tiles/*"` cache | `<FilesMatch "\.(pmtiles)$">` Cache-Control |
| `[[headers]] for = "/map-fonts/*"` cache | `<FilesMatch "\.(pbf)$">` Cache-Control |
| `[[headers]] for = "/sprites/*"` cache | `<FilesMatch "\.(png\|json)$">` Cache-Control |
| `[[redirects]] from = "/*" to = "/index.html"` | `RewriteRule ^ /index.html [QSA,L]` |

### Environment Variables

Environment variables are **build-time only** (Vite `VITE_` prefix). They are baked into the JS bundle at build time. Hostinger does not need runtime env vars.

Build with correct env vars before uploading:
```bash
# Ensure .env has:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENROUTE_API_KEY=...  # optional

bun run build
# Then upload dist/ to Hostinger
```

### Previous Story (1.4) Intelligence

- **Story 1.4 completed:** PWA manifest audit — added `id`, `scope`, `categories`, split icon `purpose`, added screenshots
- **Pattern established:** Feature commits as `feat: <description> (Story X.Y)`, code review follow-ups as `fix: code review fixes for Story X.Y — <details>`
- **Zero source code changes in 1.4** — only manifest.json and screenshots. Story 1.5 follows the same pattern: infrastructure-only changes, no `src/` modifications
- **Precache entries confirmed working:** 21 entries in SW precache manifest, including `manifest.json`, icons, sprites
- **Known review follow-ups from 1.4:** Replace placeholder screenshots (MEDIUM), add WebP icons to SW precache (LOW), verify maskable icon safe zone (LOW), align manifest/HTML descriptions (LOW)

### Git Intelligence (Recent Commits)

```
9b0b6c6 fix: code review fixes for Story 1.4 — app name consistency, icon sizes
aa954f9 feat: PWA manifest audit and install experience (Story 1.4)
63de11f fix: code review fixes for Story 1.3 — SW resilience, cache expiration, hostname match
2e24b8d feat: Workbox service worker with 5-tier offline-first caching (Story 1.3)
8d4304d fix: code review fixes for Story 1.2 — cleanup stale assets, optimize map load
```

- **Commit pattern:** `feat: <description> (Story X.Y)` for main implementation
- **Expected commit for this story:** `feat: Hostinger .htaccess deployment configuration (Story 1.5)`
- **Code review pattern:** Expect 1 follow-up commit: `fix: code review fixes for Story 1.5 — <details>`

### What NOT to Do

- Do NOT modify any `src/` files — this story is infrastructure/deployment only
- Do NOT change `vite.config.js` — the build config is correct as-is
- Do NOT change `src/sw.js` — the Service Worker is complete from Story 1.3
- Do NOT delete `netlify.toml` yet — it stays until DNS cutover is complete
- Do NOT add a CDN or Cloudflare proxy — Hostinger direct serving is sufficient for current traffic
- Do NOT enable HSTS in `.htaccess` until SSL is confirmed working on the production domain
- Do NOT use `mod_expires` directives — unreliable on LiteSpeed, use `mod_headers` Cache-Control instead
- Do NOT use Apache `expr=` syntax in Header directives — LiteSpeed ignores it
- Do NOT compress `.pmtiles` files — gzip breaks HTTP range requests needed by the PMTiles protocol handler
- Do NOT create GitHub Actions workflow — that's Story 3.4 (Phase 3)
- Do NOT change the build command — `bun run build` is correct, no new scripts needed

### Verification Checklist

After implementation, verify:
- [ ] `public/.htaccess` created with all sections (HTTPS redirect, SPA fallback, security headers, cache, MIME types, compression)
- [ ] `public/_headers` deleted (Netlify-specific)
- [ ] `public/_redirects` deleted (Netlify-specific)
- [ ] `netlify.toml` has deprecation comment (kept for transition)
- [ ] `bun run lint` passes (no ESLint errors)
- [ ] `bun run build` succeeds and `dist/.htaccess` is present in output
- [ ] Deployed to Hostinger: HTTPS works, SPA redirect works, security headers present
- [ ] PMTiles range requests work: village map renders at z12-z18
- [ ] `sw.js` response has `Cache-Control: no-store` (not cached by HTTP layer)
- [ ] Static assets have `Cache-Control: public, max-age=31536000, immutable`
- [ ] Full navigation flow works end-to-end on Android device
- [ ] Offline mode works after initial load
- [ ] Performance: first paint < 3s on Slow 3G (NFR1)

### Project Structure Notes

- Aligns with Architecture Decision 5.1 (Hostinger Hosting) and Decision 2.3 (Security Headers)
- Architecture implementation sequence: step 9 of 10 ("Create `public/.htaccess` for Hostinger")
- Files touched: `public/.htaccess` (new), `public/_headers` (delete), `public/_redirects` (delete), `CLAUDE.md` (minor update)
- No new source code files created
- Build output: `dist/.htaccess` added (copied from public/)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 5.1: Hostinger Hosting]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 5.2: Deployment Method — GitHub Actions (Phase 1 = manual)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 5.3: Environment Configuration (Vite VITE_ prefix)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 2.3: Security Headers — Replicate Netlify Configuration]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure: public/.htaccess [P1]]
- [Source: _bmad-output/planning-artifacts/architecture.md — Implementation Handoff: step 9 (Create public/.htaccess)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Implementation Handoff: step 10 (Remove Netlify files)]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.5 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md — Phase 1: Performance & Hosting (Hostinger deployment)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR1 (first paint < 3s), NFR2 (interactive map < 5s)]
- [Source: _bmad-output/planning-artifacts/prd.md — Hosting: current=Netlify free, target=Hostinger paid]
- [Source: _bmad-output/planning-artifacts/prd.md — Risk Mitigation: Target hosting performance worse than CDN]
- [Source: _bmad-output/project-context.md — Rule #9: Build configuration, Netlify deployment]
- [Source: _bmad-output/implementation-artifacts/1-4-pwa-manifest-install-experience.md — Previous story intelligence]
- [Source: netlify.toml — Current security headers and cache config to replicate]
- [Source: docs/deployment-guide.md — Current Netlify deployment setup]
- [Source: CLAUDE.md — Build commands (bun run build), deployment to Netlify]
- [Hostinger Help: mod_rewrite enabled](https://support.hostinger.com/en/articles/1583636)
- [Hostinger Help: gzip supported](https://support.hostinger.com/en/articles/1583638)
- [Hostinger Help: CORS supported](https://support.hostinger.com/en/articles/6320787)
- [Hostinger Tutorial: Force HTTPS via .htaccess](https://www.hostinger.com/tutorials/force-https-using-htaccess)
- [LiteSpeed Docs: Security Response Headers](https://docs.litespeedtech.com/lsws/security-headers/)
- [PMTiles Docs: Cloud Storage (range request requirements)](https://docs.protomaps.com/pmtiles/cloud-storage)
- [OWASP: HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

## Senior Developer Review (AI)

**Reviewer:** Charles (adversarial code review)
**Date:** 2026-02-25
**Verdict:** APPROVED with fixes applied

### Findings Summary

| ID | Severity | Description | Resolution |
|---|---|---|---|
| H1 | HIGH | `manifest.json` gets 1-year immutable cache via `<FilesMatch "\.(json)$">` — not content-hashed, stale after deploy | FIXED — Added `<FilesMatch "^manifest\.json$">` override with `no-cache` |
| M1 | MEDIUM | `Header set` only applies to 2xx responses — security headers missing on error pages | ACCEPTED — LiteSpeed recommendation, minimal practical impact with SPA fallback |
| M2 | MEDIUM | No Content-Security-Policy (CSP) header | DEFERRED — Not in AC scope, future enhancement |
| L1 | LOW | `X-Powered-By` header not stripped (server info disclosure) | FIXED — Added `Header unset X-Powered-By` |
| L2 | LOW | CLAUDE.md `build:netlify` comment misleading after Hostinger migration | FIXED — Changed to "(Netlify-specific, deprecated)" |
| L3 | LOW | AC#3 typo: `microphone()` should be `microphone=()` | FIXED — Corrected in story file |

### AC Validation

- AC#1: PARTIAL (code done, deployment verification pending tasks 4.3-4.4)
- AC#2: IMPLEMENTED
- AC#3: IMPLEMENTED
- AC#4: IMPLEMENTED
- AC#5: IMPLEMENTED
- AC#6: NOT VERIFIABLE (requires deployment + device testing)

### Task Audit

All [x] tasks verified against actual implementation. All [ ] tasks correctly marked as requiring manual deployment/device testing.

## Change Log

- 2026-02-25: Code review #1 fixes — manifest.json cache override (no-cache), X-Powered-By header stripped, CLAUDE.md build:netlify comment corrected, AC#3 typo fixed. 4 issues fixed, 1 accepted, 1 deferred.
- 2026-02-25: Implemented Tasks 1-3 and Task 4 (subtasks 4.1-4.2). Created `public/.htaccess` for Hostinger LiteSpeed Enterprise with HTTPS redirect, SPA fallback, security headers, HSTS (commented), MIME types, Cache-Control by extension, and PMTiles gzip exclusion. Removed Netlify `_headers` and `_redirects`. Added deprecation comment to `netlify.toml`. Updated `CLAUDE.md` Deployment section. Web research applied: fixed HTTPS redirect logic (AND vs OR), switched to `Header set` (LiteSpeed-compatible), used `RewriteRule [E=no-gzip:1]` for PMTiles, removed unnecessary mod_deflate block. Build and lint pass. Task 4 subtasks 4.3-4.12 require manual deployment and device testing.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Web research on LiteSpeed .htaccess best practices identified 3 corrections to initial implementation:
  1. HTTPS redirect: `[OR]` between conditions causes redirect loop on LiteSpeed proxy → changed to AND (implicit)
  2. Security headers: `Header always set` not well-supported on LiteSpeed → changed to `Header set`
  3. PMTiles gzip exclusion: `SetEnvIfNoCase` not reliable on LiteSpeed → changed to `RewriteRule [E=no-gzip:1]`
  4. mod_deflate: LiteSpeed has native GZIP/Brotli → removed dead code block, added documentation comment

### Completion Notes List

- ✅ Task 1: Created `public/.htaccess` with 9 sections (HTTPS redirect, PMTiles gzip exclusion, SPA fallback, security headers, HSTS commented, MIME types, Cache-Control static assets, Cache-Control overrides, compression note)
- ✅ Task 2: Deleted `public/_headers` and `public/_redirects`, added deprecation comment to `netlify.toml`
- ✅ Task 3: Updated `CLAUDE.md` Deployment section with Hostinger as primary, Netlify as deprecated
- ✅ Task 4.1-4.2: `bun run lint` zero errors, `bun run build` success, `dist/.htaccess` confirmed present
- ⏳ Task 4.3-4.12: Manual deployment and device testing required (Hostinger FTP/SSH upload, HTTPS verification, SPA redirect, security headers, cache headers, PMTiles range requests, Android regression test, offline mode, performance)

### File List

- `public/.htaccess` — **NEW** — Hostinger LiteSpeed Enterprise configuration (HTTPS redirect, SPA fallback, security headers, cache, MIME types, PMTiles gzip exclusion)
- `public/_headers` — **DELETED** — Netlify-specific headers file (replaced by .htaccess)
- `public/_redirects` — **DELETED** — Netlify-specific redirects file (replaced by .htaccess)
- `netlify.toml` — **MODIFIED** — Added deprecation comment (kept for DNS transition period)
- `CLAUDE.md` — **MODIFIED** — Updated Deployment section: Hostinger primary, Netlify deprecated
