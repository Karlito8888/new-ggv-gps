# Tasks: Remove PWA Features

## 1. Remove PWA Dependencies

- [x] 1.1 Remove `vite-plugin-pwa` from package.json
- [x] 1.2 Run `npm install` to update package-lock.json

## 2. Update Vite Configuration

- [x] 2.1 Remove `VitePWA` import from vite.config.js
- [x] 2.2 Remove entire `VitePWA({...})` plugin configuration
- [x] 2.3 Keep only `react()` plugin

## 3. Clean Up index.html

- [x] 3.1 Remove PWA-specific meta tags:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `mobile-web-app-capable`
  - `apple-mobile-web-app-title`
- [x] 3.2 Remove iOS splash screen link
- [x] 3.3 Remove offline detection script block
- [x] 3.4 Keep basic favicon and apple-touch-icon (for bookmarks)
- [x] 3.5 Keep theme-color (browser UI only)

## 4. Delete PWA Assets

- [x] 4.1 Delete `public/AppImages/` directory (android, ios, windows11 icons)
- [x] 4.2 Keep `public/icons/` if used for map markers
- [x] 4.3 Keep `public/markers/` directory

## 5. Remove Claude PWA Skill

- [x] 5.1 Delete `.claude/skills/pwa-config/` directory

## 6. Update Build Scripts

- [x] 6.1 Update `scripts/netlify-check.js` to remove PWA validation
- [x] 6.2 Verify build still works with `npm run build`

## 7. Update Documentation

- [x] 7.1 Update `openspec/project.md`:
  - Remove vite-plugin-pwa from tech stack
  - Remove PWA requirements section
  - Update constraints section
- [x] 7.2 Update `CLAUDE.md`:
  - Remove PWA references
  - Update browser compatibility section (remove PWA notes)
- [x] 7.3 Update `README.md` if it contains PWA instructions

## 8. Verification

- [x] 8.1 Run `npm run build` - verify no errors
- [x] 8.2 Run `npm run dev` - verify app loads correctly
- [x] 8.3 Verify no service worker is registered in browser
- [x] 8.4 Run `npm run lint` - verify no lint errors
