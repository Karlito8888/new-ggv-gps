# Change: Remove PWA Features - Focus on Web-Only Version

## Why
The project currently includes Progressive Web App (PWA) features that add complexity to the build and deployment process. The decision is to simplify the application by focusing exclusively on a standard web version, removing all PWA-specific functionality including service workers, offline caching, and installability features.

## What Changes

### Removed
- **vite-plugin-pwa** dependency and all Vite PWA configuration
- **Service Worker** generation and registration (Workbox)
- **Web App Manifest** generation
- **Offline caching** for tiles (OSM, Esri satellite), assets, and API responses
- **PWA meta tags** in index.html (apple-mobile-web-app-*, mobile-web-app-capable, theme-color for manifest)
- **PWA app icons** directory (`public/AppImages/`) - android, ios, windows11 icon sets
- **iOS splash screens** and startup images
- **Offline detection script** in index.html
- **Claude skill** `.claude/skills/pwa-config/` (no longer relevant)
- **PWA references** in documentation (CLAUDE.md, project.md, README.md)

### Kept
- Basic favicon (can use a single icon)
- Apple touch icons (for bookmarks, not PWA)
- Standard theme-color meta tag (browser UI theming, not PWA-specific)
- All navigation and mapping functionality remains unchanged

## Impact

### Affected Files
| File | Change |
|------|--------|
| `vite.config.js` | Remove VitePWA plugin and all PWA config |
| `package.json` | Remove vite-plugin-pwa dependency |
| `index.html` | Remove PWA meta tags, manifest link, offline script |
| `public/AppImages/` | Delete entire directory |
| `.claude/skills/pwa-config/` | Delete directory |
| `openspec/project.md` | Update to remove PWA references |
| `CLAUDE.md` | Update to remove PWA references |
| `README.md` | Update to remove PWA references |
| `scripts/netlify-check.js` | Remove PWA validation checks |

### User Experience Changes
- App will **no longer be installable** on home screen
- App will **require internet connection** to function
- Map tiles will **not be cached** for offline use
- No service worker means **no background updates**

### Benefits
- Simpler build configuration
- Faster build times
- Reduced bundle complexity
- No service worker debugging issues
- Clearer project scope

### Risks
- Users who relied on offline functionality will be affected
- Users who installed the PWA will need to use the web version

## Dependencies
None - this is a removal-only change with no new dependencies.
