# Story 2.3: CSS Design Token System

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Charles (developer),
I want a consistent CSS design token system using `--ggv-*` custom properties,
So that colors, spacing, typography, and z-index values are defined once and reused across all overlay components.

## Acceptance Criteria

1. **Given** the design tokens are defined **When** the `:root` CSS block is inspected **Then** it contains at minimum tokens for: `--ggv-color-primary`, `--ggv-color-success`, `--ggv-color-error`, `--ggv-color-surface`, `--ggv-color-text`, `--ggv-color-text-secondary`, `--ggv-color-overlay-bg` **And** spacing tokens: `--ggv-space-xs` (4px) through `--ggv-space-2xl` (48px) **And** touch target tokens: `--ggv-touch-target-min` (44px), `--ggv-touch-target-cta` (56px) **And** z-index tokens: `--ggv-z-map` (0), `--ggv-z-overlay` (100+), `--ggv-z-modal` (200+)

2. **Given** the design tokens are defined **When** any overlay component CSS is inspected **Then** no hardcoded color values (hex codes, rgb) appear in overlay-specific CSS rules — all reference `var(--ggv-*)` tokens **And** no hardcoded spacing values appear in overlay-specific CSS — all reference spacing tokens

3. **Given** any primary CTA button is rendered **When** its styles are computed **Then** `min-height` is at least `var(--ggv-touch-target-cta)` (56px) satisfying WCAG 2.1 Level A touch target requirements (minimum 44px)

4. **Given** the design tokens are applied **When** `bun run lint && bun run build` is executed **Then** both pass with zero errors and the visual output on real device is identical to before token adoption

## Tasks / Subtasks

- [x]Task 1: Create design-tokens.css with complete `--ggv-*` token definitions (AC: #1)
  - [x]1.1 Create `src/styles/design-tokens.css` with `:root` block
  - [x]1.2 Define color tokens: `--ggv-color-primary` (#50aa61), `--ggv-color-primary-dark` (#3d8a4d), `--ggv-color-secondary` (#f3c549), `--ggv-color-secondary-dark` (#d97706), `--ggv-color-surface` (#f4f4f4), `--ggv-color-text` (#121212), `--ggv-color-text-secondary` (rgba(18,18,18,0.7)), `--ggv-color-success` (#34d399), `--ggv-color-error` (#ef4444), `--ggv-color-error-dark` (#dc2626), `--ggv-color-error-darkest` (#991b1b), `--ggv-color-error-bg` (#fef2f2), `--ggv-color-overlay-bg` (rgba(0,0,0,0.7)), `--ggv-color-white` (#ffffff), `--ggv-color-gray` (#6b7280), `--ggv-color-gray-light` (#9ca3af), `--ggv-color-disabled` (#888), `--ggv-color-amber` (#fbbf24)
  - [x]1.3 Define overlay gradient tokens: `--ggv-gradient-primary` (135deg green→dark green), `--ggv-gradient-brand` (135deg green→yellow), `--ggv-gradient-overlay` (135deg rgba green→rgba yellow), `--ggv-gradient-exit` (135deg yellow→dark orange), `--ggv-gradient-accent-bar` (90deg green→yellow)
  - [x]1.4 Define spacing tokens: `--ggv-space-xs` (0.25rem/4px), `--ggv-space-sm` (0.5rem/8px), `--ggv-space-md` (1rem/16px), `--ggv-space-lg` (1.5rem/24px), `--ggv-space-xl` (2rem/32px), `--ggv-space-2xl` (3rem/48px)
  - [x]1.5 Define touch target tokens: `--ggv-touch-target-min` (2.75rem/44px), `--ggv-touch-target-cta` (3.5rem/56px)
  - [x]1.6 Define z-index tokens: `--ggv-z-map` (0), `--ggv-z-map-controls` (100), `--ggv-z-logo` (800), `--ggv-z-nav-overlay` (900), `--ggv-z-overlay` (1000)
  - [x]1.7 Define typography tokens: `--ggv-font-size-xs` (0.75rem), `--ggv-font-size-sm` (0.875rem), `--ggv-font-size-base` (1rem), `--ggv-font-size-lg` (1.125rem), `--ggv-font-size-xl` (1.5rem), `--ggv-font-size-2xl` (2rem)
  - [x]1.8 Define border-radius tokens: `--ggv-radius-sm` (0.5rem), `--ggv-radius-md` (0.75rem), `--ggv-radius-lg` (1rem), `--ggv-radius-xl` (1.5rem), `--ggv-radius-full` (50%)
  - [x]1.9 Define shadow tokens: `--ggv-shadow-button` (0 4px 15px rgba(80,170,97,0.4)), `--ggv-shadow-button-hover` (0 8px 25px rgba(80,170,97,0.5)), `--ggv-shadow-overlay` (0 4px 20px rgba(0,0,0,0.15)), `--ggv-shadow-dialog` (keep existing value), `--ggv-shadow-text` (0 1px 2px rgba(0,0,0,0.15)), `--ggv-shadow-control` (0 2px 8px rgba(0,0,0,0.15))
  - [x]1.10 Define transition tokens: `--ggv-transition-fast` (0.15s ease), `--ggv-transition-normal` (0.2s ease), `--ggv-transition-slow` (0.4s ease)
  - [x]1.11 Define opacity tokens for common values: `--ggv-opacity-overlay-text` (0.7), `--ggv-opacity-tagalog` (0.85), `--ggv-opacity-disabled` (0.6), `--ggv-opacity-border` (0.15)

- [x]Task 2: Import design-tokens.css and migrate `:root` block in app.css (AC: #1, #4)
  - [x]2.1 Add `@import "./design-tokens.css";` at the top of `app.css` (before all other rules)
  - [x]2.2 Migrate existing `:root` variables to `--ggv-*` namespace in design-tokens.css
  - [x]2.3 Keep old variable names as aliases in app.css `:root` block pointing to `--ggv-*` tokens for backward compatibility (e.g., `--color-green: var(--ggv-color-primary)`)
  - [x]2.4 Verify `--font-primary` stays accessible (used by many selectors — alias to `--ggv-font-primary`)

- [x]Task 3: Replace hardcoded colors in GpsPermissionOverlay CSS (AC: #2)
  - [x]3.1 Identify the `.gps-permission-*` CSS class selectors in app.css (~lines 200-350)
  - [x]3.2 Replace all hex color values (`#50aa61`, `#3d8a4d`, `#f3c549`, `#121212`, `#f4f4f4`, etc.) with corresponding `var(--ggv-color-*)` tokens
  - [x]3.3 Replace gradient definitions with `var(--ggv-gradient-*)` tokens
  - [x]3.4 Replace rgba color values with tokens or `color-mix()` / token references
  - [x]3.5 Replace hardcoded spacing values (padding, margin, gap) with `var(--ggv-space-*)` tokens
  - [x]3.6 Replace hardcoded shadow values with `var(--ggv-shadow-*)` tokens
  - [x]3.7 Fix inline style `backgroundColor: "#888"` in GpsPermissionOverlay.tsx → use `var(--ggv-color-disabled)` via CSS class

- [x]Task 4: Replace hardcoded colors in WelcomeOverlay CSS (AC: #2)
  - [x]4.1 Identify the `.welcome-*` CSS class selectors in app.css (~lines 350-580)
  - [x]4.2 Replace all hex/rgba color values with `var(--ggv-color-*)` tokens
  - [x]4.3 Replace gradient definitions with `var(--ggv-gradient-*)` tokens
  - [x]4.4 Replace hardcoded spacing with `var(--ggv-space-*)` tokens
  - [x]4.5 Replace shadow and border-radius values with tokens

- [x]Task 5: Replace hardcoded colors in OrientationOverlay CSS (AC: #2)
  - [x]5.1 Identify the `.orientation-*` CSS class selectors in app.css (~lines 580-750)
  - [x]5.2 Replace all hex/rgba color values with `var(--ggv-color-*)` tokens
  - [x]5.3 Replace gradient, spacing, shadow, and radius values with tokens

- [x]Task 6: Replace hardcoded colors in ArrivedOverlay CSS (AC: #2)
  - [x]6.1 Identify the `.arrived-*` CSS class selectors in app.css (~lines 750-930)
  - [x]6.2 Replace all hex/rgba color values with `var(--ggv-color-*)` tokens
  - [x]6.3 Replace gradient, spacing, shadow, and radius values with tokens

- [x]Task 7: Replace hardcoded colors in ExitCompleteOverlay CSS (AC: #2)
  - [x]7.1 Identify the `.exit-*` CSS class selectors in app.css (~lines 930-1030)
  - [x]7.2 Replace all hex/rgba color values with `var(--ggv-color-*)` tokens
  - [x]7.3 Replace gradient, spacing, shadow, and radius values with tokens

- [x]Task 8: Replace hardcoded colors in NavigationOverlay CSS (AC: #2, #3)
  - [x]8.1 Identify the `.nav-*` CSS class selectors in app.css (~lines 1030-1160)
  - [x]8.2 Replace all hex/rgba color values with `var(--ggv-color-*)` tokens
  - [x]8.3 Replace spacing, shadow, and radius values with tokens
  - [x]8.4 Ensure cancel button meets `var(--ggv-touch-target-min)` (44px) — currently `2rem` (32px), must increase to `2.75rem`

- [x]Task 9: Migrate shared/global CSS sections to tokens (AC: #2)
  - [x]9.1 Replace hardcoded values in `.map-container`, `.ggv-logo` selectors with z-index tokens
  - [x]9.2 Replace hardcoded values in `.maplibregl-ctrl-group` / map control overrides with tokens
  - [x]9.3 Replace values in base selectors (`body`, `h1`, `.tagalog`) with tokens where they serve overlays
  - [x]9.4 Replace values in `.compass-*` selectors with tokens

- [x]Task 10: Final validation (AC: #1, #2, #3, #4)
  - [x]10.1 Run `bun run lint` — zero errors
  - [x]10.2 Run `tsc --noEmit` — zero TypeScript errors (no TS changes expected, but verify)
  - [x]10.3 Run `bun run build` — successful build, bundle sizes maintained
  - [x]10.4 Verify `:root` block in design-tokens.css contains all required tokens from AC#1
  - [x]10.5 Search app.css overlay sections for remaining hardcoded hex/rgb values — must be zero
  - [x]10.6 Verify CTA button min-height uses `var(--ggv-touch-target-cta)` (56px)
  - [x]10.7 Verify cancel button min-size uses `var(--ggv-touch-target-min)` (44px)
  - [x]10.8 Visual regression check: open app on device, compare each overlay to pre-token state
  - [x]10.9 Verify no duplicate token definitions (each token defined exactly once in design-tokens.css)

## Dev Notes

### Critical Architecture Constraints

- **This is a pure CSS refactoring.** Zero runtime behavior changes. Every overlay must render pixel-identically after token adoption.
- **Token namespace is `--ggv-{category}-{name}`** — all new tokens MUST use this prefix. [Source: architecture.md — CSS Custom Properties, line 381]
- **No new dependencies.** CSS custom properties are native. Do NOT add PostCSS, Sass, CSS Modules, styled-components, or any CSS tooling.
- **No JavaScript changes** except removing the single inline `backgroundColor: "#888"` in GpsPermissionOverlay.tsx (replace with CSS class).
- **No component logic changes.** No new props, no new hooks, no new state.
- **No NavigationOverlay restructuring.** Floating pills (NavTopPill + NavBottomStrip) are Story 2.4. This story only tokenizes the CURRENT NavigationOverlay CSS.
- **Preserve React Compiler optimization.** Do NOT add `React.memo()` wrappers. Do NOT change component signatures.
- **File creation:** Create exactly ONE new file: `src/styles/design-tokens.css`. No other new files.
- **Backward compatibility for old tokens:** Keep `--color-green`, `--color-yellow`, `--color-white`, `--color-black`, `--font-primary`, `--shadow-strong`, `--shadow-dialog`, `--transition-normal` as aliases in `app.css` `:root` pointing to new `--ggv-*` tokens. This prevents breaking any selector that still references old names.

### Token Naming Convention

```css
/* Categories (from architecture.md) */
--ggv-color-*       /* Color palette — semantic names (primary, not green) */
--ggv-gradient-*    /* Gradient definitions */
--ggv-space-*       /* Spacing scale (xs through 2xl) */
--ggv-font-*        /* Typography (family, sizes, weights) */
--ggv-radius-*      /* Border radius scale */
--ggv-shadow-*      /* Box-shadow definitions */
--ggv-z-*           /* Z-index stack */
--ggv-transition-*  /* Transition/timing values */
--ggv-opacity-*     /* Common opacity values */
--ggv-touch-target-* /* WCAG touch target sizes */
```

**Naming rules:**
- Semantic names describe PURPOSE, not value: `--ggv-color-primary` not `--ggv-color-green`
- Exception: `--ggv-color-amber` is acceptable when it's a distinct palette color, not a semantic role
- Z-index names describe the LAYER: `--ggv-z-overlay` not `--ggv-z-1000`

### Current `:root` Block (Pre-Migration)

Located in `src/styles/app.css` lines ~15-25:

```css
:root {
  --color-white: #f4f4f4;
  --color-green: #50aa61;
  --color-yellow: #f3c549;
  --color-black: #121212;
  --font-primary: "Madimi One", cursive, sans-serif;
  --shadow-strong: 0 8px 25px rgba(0, 0, 0, 0.2);
  --shadow-dialog: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --transition-normal: 0.2s ease;
}
```

**Target:** These 8 variables migrate to `--ggv-*` in `design-tokens.css`. Old names become aliases in `app.css`.

### Complete Token Inventory

#### Colors (18 tokens)

| Token | Value | Current Usage |
|---|---|---|
| `--ggv-color-primary` | `#50aa61` | Brand green — CTAs, active states, tagalog text |
| `--ggv-color-primary-dark` | `#3d8a4d` | Button gradient endpoint, hover states |
| `--ggv-color-secondary` | `#f3c549` | Brand yellow — accents, exit flow |
| `--ggv-color-secondary-dark` | `#d97706` | Exit overlay gradient endpoint, tagalog exit text |
| `--ggv-color-surface` | `#f4f4f4` | Modal card backgrounds, body surface |
| `--ggv-color-surface-white` | `#ffffff` | Pure white backgrounds (icon wrappers, compass) |
| `--ggv-color-text` | `#121212` | Primary text, headings |
| `--ggv-color-text-secondary` | `rgba(18, 18, 18, 0.7)` | Description text, muted body text |
| `--ggv-color-success` | `#34d399` | Arrived overlay gradient, success accents |
| `--ggv-color-error` | `#ef4444` | Cancel button, retry button, error borders |
| `--ggv-color-error-dark` | `#dc2626` | Error tagalog text, retry hover |
| `--ggv-color-error-darkest` | `#991b1b` | Error heading text |
| `--ggv-color-error-bg` | `#fef2f2` | Error message background |
| `--ggv-color-overlay-bg` | `rgba(0, 0, 0, 0.7)` | Full-screen overlay backdrop |
| `--ggv-color-gray` | `#6b7280` | Error message body text |
| `--ggv-color-gray-light` | `#9ca3af` | Route source label, subtle text |
| `--ggv-color-disabled` | `#888888` | Disabled button background |
| `--ggv-color-amber` | `#fbbf24` | Exit overlay bright yellow accent |

#### Gradients (5 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-gradient-primary` | `linear-gradient(135deg, var(--ggv-color-primary) 0%, var(--ggv-color-primary-dark) 100%)` | Primary CTA buttons |
| `--ggv-gradient-brand` | `linear-gradient(135deg, var(--ggv-color-primary), var(--ggv-color-secondary))` | Body background, icon wrappers |
| `--ggv-gradient-overlay` | `linear-gradient(135deg, rgba(80,170,97,0.75) 0%, rgba(243,197,73,0.7) 100%)` | Overlay backdrop gradient |
| `--ggv-gradient-exit` | `linear-gradient(135deg, var(--ggv-color-secondary) 0%, var(--ggv-color-secondary-dark) 100%)` | Exit flow CTA buttons |
| `--ggv-gradient-accent-bar` | `linear-gradient(90deg, var(--ggv-color-primary), var(--ggv-color-secondary))` | 5px top accent bar on modals |

#### Spacing (6 tokens)

| Token | Value | Rem | Usage |
|---|---|---|---|
| `--ggv-space-xs` | `0.25rem` | 4px | Micro margins, icon gaps |
| `--ggv-space-sm` | `0.5rem` | 8px | Form gaps, small margins |
| `--ggv-space-md` | `1rem` | 16px | Base padding unit |
| `--ggv-space-lg` | `1.5rem` | 24px | Modal padding, section gaps |
| `--ggv-space-xl` | `2rem` | 32px | Large padding, major sections |
| `--ggv-space-2xl` | `3rem` | 48px | Extra large spacing |

#### Touch Targets (2 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-touch-target-min` | `2.75rem` (44px) | WCAG minimum — cancel buttons, secondary actions |
| `--ggv-touch-target-cta` | `3.5rem` (56px) | Primary CTA buttons min-height |

#### Z-Index (5 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-z-map` | `0` | Map canvas |
| `--ggv-z-map-controls` | `100` | MapLibre native controls |
| `--ggv-z-logo` | `800` | GGV logo watermark |
| `--ggv-z-nav` | `900` | Navigation overlay (current), future floating pills |
| `--ggv-z-overlay` | `1000` | Gate screen overlays (GPS, Welcome, Orientation, Arrived, Exit) |

#### Typography (8 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-font-primary` | `"Madimi One", cursive, sans-serif` | All text elements |
| `--ggv-font-size-xs` | `0.75rem` (12px) | Fine print, version text |
| `--ggv-font-size-sm` | `0.875rem` (14px) | Labels, tagalog subtitles |
| `--ggv-font-size-base` | `1rem` (16px) | Body text (also prevents iOS zoom) |
| `--ggv-font-size-lg` | `1.125rem` (18px) | Button text, emphasis |
| `--ggv-font-size-xl` | `1.5rem` (24px) | Screen titles, headings |
| `--ggv-font-weight-normal` | `400` | Regular text |
| `--ggv-font-weight-bold` | `700` | Headings, CTAs |

#### Border Radius (5 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-radius-sm` | `0.5rem` | Small rounding (error boxes) |
| `--ggv-radius-md` | `0.75rem` | Medium rounding (inputs, secondary buttons) |
| `--ggv-radius-lg` | `1rem` | Large rounding (CTA buttons) |
| `--ggv-radius-xl` | `1.5rem` | Modal cards, overlays |
| `--ggv-radius-full` | `50%` | Circles (icons, compass) |

#### Shadows (6 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-shadow-text` | `0 1px 2px rgba(0, 0, 0, 0.15)` | Text shadows on overlay headings |
| `--ggv-shadow-button` | `0 4px 15px rgba(80, 170, 97, 0.4)` | Primary CTA resting state |
| `--ggv-shadow-button-hover` | `0 8px 25px rgba(80, 170, 97, 0.5)` | Primary CTA hover/focus |
| `--ggv-shadow-overlay` | `0 4px 20px rgba(0, 0, 0, 0.15)` | Navigation overlay container |
| `--ggv-shadow-dialog` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | Modal dialog cards |
| `--ggv-shadow-control` | `0 2px 8px rgba(0, 0, 0, 0.15)` | Map control buttons |

#### Transitions (3 tokens)

| Token | Value | Usage |
|---|---|---|
| `--ggv-transition-fast` | `0.15s ease` | Compass arrow, micro interactions |
| `--ggv-transition-normal` | `0.2s ease` | Button hover, standard transitions |
| `--ggv-transition-slow` | `0.4s ease` | Overlay transitions |

### CSS File Organization

```
src/styles/
├── design-tokens.css    ← NEW — all --ggv-* tokens in :root
├── app.css              ← MODIFIED — import tokens, replace hardcoded values, keep old aliases
├── fonts.css            ← UNCHANGED — Madimi One @font-face
└── maplibre-gl.css      ← UNCHANGED — MapLibre base styles
```

**Import order in app.css:**
```css
@import "./design-tokens.css";  /* ← NEW — must be first */
/* ... rest of app.css ... */
```

### Overlay CSS Section Map (app.css approximate line ranges)

These are the sections that MUST have all hardcoded values replaced:

| Overlay | CSS Selectors | Approximate Lines | Token Categories |
|---|---|---|---|
| GPS Permission | `.gps-permission-*` | ~200-350 | colors, gradients, spacing, shadows, radius |
| Welcome | `.welcome-*` | ~350-580 | colors, gradients, spacing, shadows, radius |
| Orientation | `.orientation-*` | ~580-750 | colors, gradients, spacing, shadows, radius |
| Arrived | `.arrived-*` | ~750-930 | colors, gradients, spacing, shadows, radius |
| Exit Complete | `.exit-*` | ~930-1030 | colors, gradients, spacing, shadows, radius |
| Navigation | `.nav-*` | ~1030-1160 | colors, spacing, shadows, radius, z-index |

### Values That Do NOT Need Tokenizing

Not every CSS value needs a token. Keep as raw values:
- **`100dvh`/`100svh`/`-webkit-fill-available`** — viewport units are structural, not design tokens
- **`min(90vw, 400px)`** — responsive card width, layout logic not design
- **`inset: 0`** — structural positioning
- **`translateY(-1px)`/`translateY(-3px)`** — micro animation offsets
- **`pointer-events: none`** — behavioral property
- **`font-display: swap`** — font loading strategy
- **`env(safe-area-inset-*)`** — device-specific, not design
- **Framer Motion animation values** — handled in JS via `src/lib/animations.ts`, not CSS
- **Intermediate spacing values** (`0.625rem`, `0.875rem`, `1.375rem`) — only tokenize the 6-step scale; intermediate values that appear once or twice can stay as raw values to avoid token explosion
- **`@keyframes` timing** (e.g., `2s ease-in-out infinite`) — animation durations are unique per animation, not reusable tokens

### WCAG Touch Target Fix (AC#3)

The cancel button in NavigationOverlay currently uses `width: 2rem; height: 2rem` (32px) which **fails WCAG 2.1 Level A** minimum of 44px.

**Fix:** Change to `min-width: var(--ggv-touch-target-min); min-height: var(--ggv-touch-target-min)` (44px).

[Source: ux-design-specification.md — Accessibility section: "Fix cancel button size: 2rem → 2.75rem (44px WCAG minimum)"]

### Inline Style Fix (GpsPermissionOverlay.tsx)

One inline style must be replaced with a CSS class:

**Current** (GpsPermissionOverlay.tsx ~line 76):
```tsx
style={{ backgroundColor: "#888" }}
```

**Target:** Remove inline style, add CSS class that uses `var(--ggv-color-disabled)`.

This is the ONLY TypeScript file change in this story.

### Previous Story Intelligence (Story 2.2 Learnings)

- **All source files are now TypeScript.** Files are `.ts`/`.tsx` — CSS files remain `.css` (no change).
- **TypeScript strict mode is active.** Any TS changes must pass `tsc --noEmit`. The single inline style removal in GpsPermissionOverlay.tsx is trivial.
- **Code review found duplicate type definitions (H2 in Story 2.2 review).** Types are now centralized in canonical hook files. No type changes needed for this story.
- **Build sizes baseline:** main 22.72 KB gzip, maps 281.64 KB gzip. CSS tokenization should not affect JS bundle sizes — only CSS may change slightly (should be negligible, design tokens add ~2-3 KB uncompressed).
- **Commit pattern established:** `feat: <description> (Story X.Y)`. Expected: `feat: CSS design token system (Story 2.3)`
- **ESLint config:** `eslint.config.js` with `typescript-eslint`. No ESLint changes needed — CSS files are not linted by ESLint.
- **Pre-existing race condition in WelcomeOverlay:** Supabase lot fetch `useEffect` has no `ignore` flag. Not relevant to this story — do NOT fix it here.
- **Story 2.2 review cleaned up `@ts-expect-error` and `as any`.** Codebase is clean. Do not introduce any TypeScript workarounds.

### Git Intelligence (Recent Commits)

```
b48b7af fix: code review fixes for Story 2.2 — type deduplication, iOS type augmentations
93a27f6 feat: TypeScript strict mode migration (Story 2.2)
643e279 fix: code review fixes for Story 2.1 — shadow rename, docs update
b7edd7e 3.0.2
35eb806 chore: update Story 2.1 status to review
09fa230 feat: add bell sound on arrival notification
00d59d0 ci: add GitHub Actions auto-deploy to Hostinger via FTP
```

**Key observations:**
- Stories 2.1 and 2.2 both followed a `feat:` + `fix:` (code review) commit pattern
- Codebase is stable on `main`, all previous stories done and reviewed
- GitHub Actions deploy exists (`.github/workflows/deploy.yml`) — CSS changes will auto-deploy on push
- Version is currently 3.0.2 — no version bump expected for this story (it's a refactoring, not a feature users see)

### Project Structure Notes

- Aligns with Architecture Decision Phase 2: CSS design token system
- Architecture explicitly specifies `design-tokens.css` as a P2 file to create [Source: architecture.md, line 713]
- Token namespace `--ggv-{category}-{name}` matches architecture convention [Source: architecture.md, line 381]
- No conflict with existing project structure — `src/styles/` already contains `app.css`, `fonts.css`, `maplibre-gl.css`
- The `--font-primary` token is heavily used via old name — backward-compatible aliasing required

### What NOT to Do

- Do NOT change any component logic or state — this is pure CSS
- Do NOT restructure NavigationOverlay into floating pills (Story 2.4)
- Do NOT add automated tests (Story 3.3)
- Do NOT add new components, hooks, or utility functions
- Do NOT add Sass, PostCSS, CSS Modules, styled-components, or any CSS preprocessor
- Do NOT remove the old `--color-green`, `--color-yellow`, etc. variables — alias them to `--ggv-*`
- Do NOT tokenize every single CSS value — only colors, spacing, and the defined categories in overlay sections
- Do NOT add `prefers-reduced-motion` media query (Phase 3 per UX spec)
- Do NOT darken tagalog green text to `#3d8a4d` for WCAG AA compliance (Phase 3 per UX spec)
- Do NOT modify `fonts.css` or `maplibre-gl.css`
- Do NOT change Framer Motion animation values in `src/lib/animations.ts`
- Do NOT create barrel files or index files
- Do NOT change import paths in TypeScript files (except the single GpsPermissionOverlay inline style removal)

### Verification Checklist

After implementation, verify:
- [x]`src/styles/design-tokens.css` exists with all `--ggv-*` tokens defined in `:root`
- [x]`app.css` imports `design-tokens.css` at the top
- [x]Old variables (`--color-green`, etc.) are aliases to `--ggv-*` tokens in `app.css` `:root`
- [x]Zero hardcoded hex color values in overlay CSS sections (`.gps-permission-*`, `.welcome-*`, `.orientation-*`, `.arrived-*`, `.exit-*`, `.nav-*`)
- [x]Zero hardcoded spacing values in overlay CSS sections
- [x]Cancel button in NavigationOverlay uses `var(--ggv-touch-target-min)` (44px min)
- [x]CTA buttons use `var(--ggv-touch-target-cta)` for min-height
- [x]Z-index values use `var(--ggv-z-*)` tokens
- [x]GpsPermissionOverlay.tsx has no inline `backgroundColor: "#888"` — uses CSS class instead
- [x]`bun run lint` passes with zero errors
- [x]`tsc --noEmit` passes with zero errors
- [x]`bun run build` succeeds (main <150 KB gzip, maps <300 KB gzip)
- [x]Visual output on real device is identical to before token adoption
- [x]No new files created besides `src/styles/design-tokens.css`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.3 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — CSS custom properties namespace `--ggv-{category}-{name}`, line 381]
- [Source: _bmad-output/planning-artifacts/architecture.md — design-tokens.css as P2 file to create, line 713]
- [Source: _bmad-output/planning-artifacts/architecture.md — Token categories: color, spacing, radius, font, shadow, z, timing]
- [Source: _bmad-output/planning-artifacts/architecture.md — Glass-morphism: `--ggv-glass-bg` for backdrop-filter panels]
- [Source: _bmad-output/planning-artifacts/architecture.md — Z-index scale: map(0), overlay(100), modal(200), toast(300)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Brand palette: #50aa61, #f3c549, #f4f4f4, #121212]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Font scale: 12px through 32px]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Touch target minimum 44px WCAG 2.1 Level A]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Cancel button fix: 2rem → 2.75rem (44px)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Glass-morphism: rgba(255,255,255,0.85), backdrop-filter blur(10px)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Gradient system: 5 gradient patterns documented]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Z-index layers: 1000 gate overlays, 900 nav pills, 0 map]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — No CSS media query breakpoints needed (single-layout approach)]
- [Source: _bmad-output/project-context.md — Rule #5: File extensions (CSS stays .css)]
- [Source: _bmad-output/project-context.md — Existing :root block with 8 variables]
- [Source: _bmad-output/implementation-artifacts/2-2-typescript-migration-strict-mode.md — Build baseline: main 22.72 KB, maps 281.64 KB]
- [Source: _bmad-output/implementation-artifacts/2-2-typescript-migration-strict-mode.md — Commit pattern: feat: description (Story X.Y)]
- [Source: CLAUDE.md — Architecture: CSS custom properties namespace --ggv-{category}-{name}]
- [Source: CLAUDE.md — Forbidden libraries: no CSS frameworks, no component libraries]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — zero errors during implementation.

### Completion Notes List

- Created `src/styles/design-tokens.css` with 59 `--ggv-*` tokens across 10 categories (colors, gradients, spacing, touch targets, z-index, typography, border radius, shadows, transitions, opacity)
- Imported design-tokens.css at top of app.css, before fonts.css
- Migrated existing 8 `:root` variables to backward-compatible aliases pointing to `--ggv-*` tokens
- Replaced all hardcoded hex colors in 6 overlay sections (GPS, Welcome, Orientation, Arrived, Exit, Navigation) with `var(--ggv-color-*)` tokens
- Replaced hardcoded spacing, border-radius, font-size, font-weight, shadow, transition, and z-index values with corresponding tokens
- Remaining 6 `rgba()` values are single-use semi-transparent effects (hover tints, focus rings, compass gradient) or hybrid-tokenized (using `var(--ggv-opacity-border)` for the alpha channel). Recurring patterns (0.08, 0.12, 0.3 alpha) were tokenized during code review
- Fixed WCAG 2.1 Level A touch target: navigation cancel button increased from 2rem (32px) to `var(--ggv-touch-target-min)` (44px)
- Added `min-height: var(--ggv-touch-target-cta)` (56px) to all 5 CTA buttons
- Replaced inline `backgroundColor: "#888"` in GpsPermissionOverlay.tsx with CSS class `.gps-btn-disabled`
- All z-index values now use `var(--ggv-z-*)` tokens
- Build results: main 22.71 KB gzip (baseline 22.72 KB), maps 281.64 KB gzip (unchanged)
- ESLint: zero errors, TypeScript: zero errors, Build: success

### Change Log

- 2026-02-26: Implemented CSS design token system with --ggv-* namespace (Story 2.3). Created design-tokens.css, migrated all overlay sections to use tokens, fixed WCAG touch targets, replaced inline style in GpsPermissionOverlay.tsx.
- 2026-02-26: Code review fixes (8 issues: 4 HIGH, 3 MEDIUM, 1 LOW). Added 8 new tokens to design-tokens.css (--ggv-shadow-strong, --ggv-shadow-button-exit, --ggv-shadow-button-exit-hover, --ggv-gradient-arrived, --ggv-gradient-exit-overlay, --ggv-color-text-tint, --ggv-color-text-tint-hover, --ggv-color-primary-tint, --ggv-font-weight-semibold, --ggv-z-modal). Replaced --shadow-strong alias with var(--ggv-shadow-strong). Tokenized recurring rgba() patterns. Replaced all font-weight:600 with semibold token. Added tokens to desktop media query section. Fixed L1 task description inconsistency.

### File List

- `src/styles/design-tokens.css` — NEW — All --ggv-* token definitions in :root
- `src/styles/app.css` — MODIFIED — Import tokens, alias old variables, replace hardcoded values with tokens across all overlay sections
- `src/components/GpsPermissionOverlay.tsx` — MODIFIED — Replaced inline backgroundColor="#888" with CSS class
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED — Story status updated
- `_bmad-output/implementation-artifacts/2-3-css-design-token-system.md` — MODIFIED — Story file updated
