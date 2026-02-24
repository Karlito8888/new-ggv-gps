# Story 1.1: Self-Hosted Map Style, Glyphs & Sprites

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor launching the app on a weak 3G connection,
I want the map style, fonts, and sprites to load from locally hosted files,
So that the map appears and labels are readable without any external network dependency.

## Acceptance Criteria

1. **Given** the app is loaded for the first time on any connection **When** the MapLibre map initializes **Then** the map style JSON is fetched from `/style/style.json` (self-hosted) instead of `tiles.openfreemap.org` **And** all glyph (font) files are fetched from `/map-fonts/{fontstack}/{range}.pbf` (self-hosted) instead of `demotiles.maplibre.org` **And** all sprite files are fetched from `/sprites/` (self-hosted) instead of any external CDN

2. **Given** the device has no internet connection **When** the map initializes after a previous cached visit **Then** the map renders with correct labels and block names without any network requests for style, glyphs, or sprites

3. **Given** the self-hosted style.json is in place **When** the map initializes with the fixed OSM style **Then** the style renders correctly with locally served glyph files and no external CDN dependency

4. **Given** the implementation is complete **When** `bun run lint && bun run build` is executed **Then** both commands pass with zero errors **And** the self-hosted style, fonts, and sprites assets are present in the `dist/` output directory

## Tasks / Subtasks

- [x] Task 1: Download and customize OpenFreeMap Liberty style.json (AC: #1, #3)
  - [x] 1.1 Fetch current Liberty style from `https://tiles.openfreemap.org/styles/liberty`
  - [x] 1.2 Save as `public/style/style.json`
  - [x] 1.3 Update `glyphs` property: `"glyphs": "/map-fonts/{fontstack}/{range}.pbf"`
  - [x] 1.4 Update `sprite` property: `"sprite": "/sprites/liberty"` (relative path to self-hosted sprites)
  - [x] 1.5 Keep tile sources pointing to OpenFreeMap for now (tiles are Story 1.2 — PMTiles)
  - [x] 1.6 Verify style.json parses correctly and all layer references resolve
- [x] Task 2: Download and host map glyph/font PBF files (AC: #1, #2, #3)
  - [x] 2.1 Identify all font stacks referenced in the Liberty style.json (e.g., "Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic")
  - [x] 2.2 Download corresponding .pbf glyph range files (0-255.pbf, 256-511.pbf, ..., 65280-65535.pbf) for each font stack
  - [x] 2.3 Place in `public/map-fonts/{font-stack-name}/` directory structure
  - [x] 2.4 Verify font stack directory names match EXACTLY what the style.json references (case-sensitive, spaces included)
  - [x] 2.5 Test that MapLibre can load glyphs from the local path
- [x] Task 3: Download and host sprite files (AC: #1, #3)
  - [x] 3.1 Download sprite atlas files from OpenFreeMap Liberty source: `liberty.png`, `liberty@2x.png`, `liberty.json`, `liberty@2x.json`
  - [x] 3.2 Place in `public/sprites/` directory
  - [x] 3.3 Verify the `sprite` property in style.json resolves to the correct local sprite files
- [x] Task 4: Update useMapSetup.js to use self-hosted style (AC: #1, #3)
  - [x] 4.1 Remove the `fetch("https://tiles.openfreemap.org/styles/liberty")` call
  - [x] 4.2 Remove the manual `style.glyphs` override (`demotiles.maplibre.org` line)
  - [x] 4.3 Set the map style to the local path: `style: "/style/style.json"`
  - [x] 4.4 Keep the `styleimagemissing` handler as safety net (remove only if sprites fully resolve)
  - [x] 4.5 Keep the style error suppression for tile data null values
- [x] Task 5: Verify build and lint (AC: #4)
  - [x] 5.1 Run `bun run lint` — zero errors
  - [x] 5.2 Run `bun run build` — zero errors
  - [x] 5.3 Verify `dist/style/style.json`, `dist/map-fonts/`, and `dist/sprites/` exist in build output
  - [x] 5.4 Run `bun run preview` and verify map renders with local assets (check Network tab — zero external style/font/sprite requests)

## Dev Notes

### Critical Architecture Constraints

- **Phase 1 = JavaScript only.** Do NOT rename files to .ts/.tsx. Keep all extensions as .js/.jsx.
- **KISS principle applies.** No new hooks, no new abstraction layers. The change is in `useMapSetup.js` only.
- **Forbidden libraries remain forbidden:** No react-map-gl, no Turf.js, no new dependencies for this story.
- **No changes to navigation state machine.** This story only affects map initialization — not overlays, routing, or arrival detection.

### Current Code Analysis — What Changes

**File: `src/hooks/useMapSetup.js` (lines 88-106)**

Current flow:
```js
const [maplibregl, styleResponse] = await Promise.all([
  import("maplibre-gl"),
  fetch("https://tiles.openfreemap.org/styles/liberty"),  // ← REMOVE external fetch
]);
const style = await styleResponse.json();
style.glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";  // ← REMOVE manual override

const MapLibre = maplibregl.default || maplibregl;
mapInstance = new MapLibre.Map({
  container: containerRef.current,
  style: style,  // ← CHANGE to "/style/style.json"
  // ...
});
```

Target flow:
```js
const maplibregl = await import("maplibre-gl");
const MapLibre = maplibregl.default || maplibregl;
mapInstance = new MapLibre.Map({
  container: containerRef.current,
  style: "/style/style.json",  // ← Self-hosted, all paths resolved inside
  // ...
});
```

**Key simplification:** By self-hosting style.json with correct `glyphs` and `sprite` paths baked in, the initialization code SIMPLIFIES — no more `Promise.all`, no more manual `style.glyphs` override, no more `fetch()` + `.json()` parse.

### Static Asset Paths (from Architecture Decision)

```
public/
├── map-fonts/                   # [NEW] .pbf glyph files for map labels
│   ├── Noto Sans Regular/       # Font stack name (exact match from style.json)
│   │   ├── 0-255.pbf
│   │   ├── 256-511.pbf
│   │   └── ... (up to 65280-65535.pbf)
│   ├── Noto Sans Bold/
│   │   └── ...
│   └── Noto Sans Italic/        # If referenced by style
│       └── ...
├── sprites/                     # [NEW] Sprite atlas for map icons
│   ├── liberty.json
│   ├── liberty.png
│   ├── liberty@2x.json
│   └── liberty@2x.png
├── style/                       # [NEW] Self-hosted map style
│   └── style.json
├── fonts/                       # [EXISTING — DO NOT TOUCH] App UI fonts
│   ├── madimi-one-latin.woff2
│   └── madimi-one-latin-ext.woff2
└── ...                          # Other existing files unchanged
```

**CRITICAL:** `public/fonts/` contains APP UI fonts (Madimi One woff2). Map glyph PBF fonts go in `public/map-fonts/` — do NOT mix them.

### OpenFreeMap Liberty Style — Font Stacks to Download

The Liberty style uses these font stacks (verify against downloaded style.json):
- `Noto Sans Regular` — body text, labels
- `Noto Sans Bold` — headings, emphasis
- `Noto Sans Italic` — secondary labels

Font stack directories in `public/map-fonts/` must match EXACTLY what appears in style.json `text-font` arrays. MapLibre uses the directory name as-is in the URL template.

### Sprite Files Source

The Liberty style sprites are available from the OpenFreeMap sprite sources. The `sprite` property in style.json should be a relative path: `/sprites/liberty` (MapLibre appends `.json`, `.png`, `@2x.json`, `@2x.png` automatically).

### Performance Considerations

- Self-hosted style.json is tiny (~50-100 KB) — eliminates one blocking network request
- PBF glyph files are ~20-50 KB each, loaded on-demand by MapLibre as text labels appear at different zoom levels
- Sprite atlas is typically ~100-200 KB (png + json) — loaded once at map init
- Total additional static asset size: ~5-15 MB for all fonts (many ranges, multiple stacks)
- These assets will be precached by the Service Worker in Story 1.3

### What NOT to Do

- Do NOT change the tile sources in style.json (tiles are Story 1.2 — PMTiles)
- Do NOT create a new hook or utility file for style loading
- Do NOT add any npm dependencies
- Do NOT touch `public/fonts/` (UI fonts, not map fonts)
- Do NOT change any overlay components
- Do NOT remove the `styleimagemissing` handler until sprites are confirmed working
- Do NOT change the `"text-font": ["Noto Sans Regular"]` reference in the `addBlockLabels` function — it must match one of the font stacks in style.json and in `public/map-fonts/`

### Verification Checklist

After implementation, verify in browser Network tab:
- [ ] Zero requests to `tiles.openfreemap.org/styles/*`
- [ ] Zero requests to `demotiles.maplibre.org/font/*`
- [ ] Style loaded from `/style/style.json` (local)
- [ ] Glyphs loaded from `/map-fonts/*/` (local)
- [ ] Sprites loaded from `/sprites/` (local)
- [ ] Map labels render correctly (block names, street names)
- [ ] `bun run lint` passes
- [ ] `bun run build` passes
- [ ] Build output contains `dist/style/`, `dist/map-fonts/`, `dist/sprites/`

### Project Structure Notes

- This story aligns with Architecture Decision 1.2 (self-hosted assets in `public/`) and cross-cutting concern #3 (self-hosted map assets)
- `public/map-fonts/` path matches architecture doc's directory structure at line 673-675
- `public/style/style.json` matches architecture doc at line 677
- The `addBlockLabels` function in `useMapSetup.js` references `"Noto Sans Regular"` at line 42 — this font MUST be included in the self-hosted fonts
- No conflicts detected with existing file structure

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 1.2, Decision 1.3, Static Asset Organization]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.1 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24 (self-hosted style), FR25 (self-hosted fonts)]
- [Source: _bmad-output/project-context.md — Rule #2 MapLibre native API, Rule #4 file organization]
- [Source: src/hooks/useMapSetup.js — lines 88-106 (current style loading), line 42 (Noto Sans Regular font reference)]
- [Source: CLAUDE.md — Map style initialization pattern, forbidden libraries]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Font PBF downloads: urllib.request failed silently; solved by using subprocess curl with 15 workers — all 768 files downloaded successfully.
- Font source URL: `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf` (URL-encoded spaces as `%20`).
- Sprite source URL: `https://tiles.openfreemap.org/sprites/ofm_f384/ofm` → renamed to `liberty.*` locally.
- Browser verification (agent-browser): `index.html` had a `<link rel="preload">` pointing to the old external style URL — browser warning "preloaded but not used". Fixed by replacing with `/style/style.json` preload and removing stale `preconnect` to `demotiles.maplibre.org`.
- After fix: zero external style/font/sprite requests confirmed in Network tab (incognito Chrome). Only 2 external requests remain: Supabase (blocks data) + OpenFreeMap (tile TileJSON — expected for Story 1.2).

### Completion Notes List

- **Task 1**: Downloaded Liberty style.json (43KB) from OpenFreeMap, updated `glyphs` to `/map-fonts/{fontstack}/{range}.pbf` and `sprite` to `/sprites/liberty`. Tile sources unchanged (Story 1.2). Style JSON valid.
- **Task 2**: Identified 3 font stacks: Noto Sans Regular, Bold, Italic. Downloaded all 256 ranges per stack (768 PBF files total, ~102MB). Directory names match style.json exactly (spaces preserved).
- **Task 3**: Downloaded 4 sprite files (liberty.json, liberty.png, liberty@2x.json, liberty@2x.png) from OpenFreeMap CDN → `public/sprites/`.
- **Task 4**: Simplified `useMapSetup.js` `initMap()` — removed `Promise.all`, removed `fetch()` + `.json()` + manual `style.glyphs` override. Now uses `style: "/style/style.json"` directly. `styleimagemissing` handler and error suppression kept.
- **Task 5**: `bun run lint` = zero errors. `bun run build` = success. `dist/style/`, `dist/map-fonts/`, `dist/sprites/` all present.

### File List

- `public/style/style.json` (new — self-hosted Liberty style with local glyphs/sprite paths)
- `public/sprites/liberty.json` (new)
- `public/sprites/liberty.png` (new)
- `public/sprites/liberty@2x.json` (new)
- `public/sprites/liberty@2x.png` (new)
- `public/map-fonts/Noto Sans Regular/*.pbf` (new — 256 files)
- `public/map-fonts/Noto Sans Bold/*.pbf` (new — 256 files)
- `public/map-fonts/Noto Sans Italic/*.pbf` (new — 256 files)
- `src/hooks/useMapSetup.js` (modified — simplified map init, removed external fetch/glyphs override)
- `index.html` (modified — replaced external style preload with local `/style/style.json` preload; removed stale `preconnect` and CSP references to `demotiles.maplibre.org`)
- `netlify.toml` (modified — added cache headers for `/style/*`, `/sprites/*`, `/map-fonts/*`)
- `.gitattributes` (new — marks `*.pbf` as binary)

## Change Log

- 2026-02-24: Implemented Story 1.1 — self-hosted map style, glyphs, and sprites. Removed external dependencies on tiles.openfreemap.org style API and demotiles.maplibre.org font API. Map now loads all static assets from local paths.
- 2026-02-24: Code review fixes — removed stale `demotiles.maplibre.org` from CSP (index.html), added cache headers for self-hosted map assets (netlify.toml), removed stray `public/map-fonts/Noto` binary file, added `.gitattributes` for PBF binary handling.
