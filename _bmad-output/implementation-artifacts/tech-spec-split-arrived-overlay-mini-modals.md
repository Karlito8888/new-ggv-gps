---
title: 'Split Arrived Overlay into Two Mini-Modals'
slug: 'split-arrived-overlay-mini-modals'
created: '2026-02-28'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react-19', 'typescript', 'framer-motion-12', 'maplibre-gl-5', 'css-custom-properties']
files_to_modify: ['src/components/ArrivedOverlay.tsx', 'src/styles/app.css', 'src/lib/animations.ts', 'src/styles/design-tokens.css']
code_patterns: ['overlay-split-layout', 'slide-animations', 'semi-transparent-backdrop', 'framer-motion-m-component', 'css-design-tokens']
test_patterns: ['manual-device-testing']
adversarial_review: 'completed — 14 findings fixed'
---

# Tech-Spec: Split Arrived Overlay into Two Mini-Modals

**Created:** 2026-02-28

## Overview

### Problem Statement

The `ArrivedOverlay` currently renders as a single full-screen modal with an opaque green gradient background (`--ggv-gradient-arrived`). This completely hides the map underneath, preventing the user from seeing their current position and the destination marker at the moment of arrival — precisely when that visual context is most useful.

### Solution

Split the single modal into two small modals positioned at the top and bottom of the screen, with a semi-transparent backdrop between them. This lets the user see the map (their position + destination pin) while still presenting the arrival confirmation UI.

- **Top mini-modal**: Success icon + "You've Arrived!" + "(Nakarating ka na!)" + descriptive text
- **Bottom mini-modal**: "Navigate Somewhere Else" + "Exit Village" buttons
- **Backdrop**: Light semi-transparent veil (replacing the opaque gradient)
- **Animations**: Top modal slides in from above, bottom modal slides in from below

### Scope

**In Scope:**
- Restructure `ArrivedOverlay.tsx` JSX into two mini-modals within the same overlay container
- Top modal: icon, title, tagalog subtitle, destination description
- Bottom modal: primary + secondary action buttons (no accent bar)
- Reduce arrived overlay background opacity to a light veil
- New Framer Motion animation variants for slide-from-top / slide-from-bottom (with explicit spring exit transitions)
- CSS adjustments in `app.css` for split layout positioning
- New design token for arrived backdrop veil

**Out of Scope:**
- Changes to other overlays (GPS, Welcome, Orientation, Navigation, Exit)
- Changes to navigation state machine in App.tsx
- Changes to hooks (useMapSetup, useRouting, useNavigation)
- New props or component API changes
- New dependencies

## Context for Development

### Codebase Patterns

**Overlay architecture** (confirmed by code investigation):
- All overlays use `<m.div className="overlay ...">` as outer container with `overlayVariants` (fade in/out)
- Inside, a single `<m.div className="modal ...">` with `modalVariants` (scale + spring) contains all content
- Overlays are rendered inside `<AnimatePresence mode="wait">` in `App.tsx:362`, keyed by state name
- Shared variants are exported from `src/lib/animations.ts` — not inlined
- **Framer Motion variant propagation**: The parent `m.div` declares `initial="hidden"`, `animate="visible"`, `exit="exit"`. Child `m.div` elements with `variants` automatically inherit these state names without needing their own `initial`/`animate`/`exit` props. This is how both mini-modals will animate — they only need `variants={slideFromTopVariants}` or `variants={slideFromBottomVariants}` and Framer Motion propagates the state from the parent. Do NOT add a nested `AnimatePresence` or separate `initial`/`animate`/`exit` props on the children.

**CSS structure** (confirmed):
- `.overlay` (app.css:137): `position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: var(--ggv-z-overlay); padding: var(--ggv-space-md)`
- `.modal` (app.css:152): `background: var(--ggv-color-surface); border-radius: var(--ggv-radius-xl); width: 100%; box-shadow: var(--ggv-shadow-dialog); text-align: center; position: relative; overflow: hidden`
- `.modal::before` (app.css:164): accent bar gradient at top of modal
- `.arrived-overlay` (app.css:484): overrides background to `var(--ggv-gradient-arrived)`
- `.arrived-modal::before` (app.css:489): green accent bar override
- `.arrived-icon-wrapper` (app.css:493): green gradient + `success-bounce` animation
- `.arrived-icon-wrapper::after` (app.css:512): `success-ring` pulse animation
- `.arrived-overlay .overlay-btn-primary` (app.css:531): `margin-bottom: 0.75rem` — this rule remains correct in the new layout because the primary button is still above the secondary button inside the bottom mini-modal
- `.overlay-description` (app.css:243): has `margin-bottom: var(--ggv-space-xl)` (2rem) — designed for spacing before buttons. In the split layout, the description is the last element in the top modal, so this margin must be overridden to `0` to avoid dead space at the bottom of the top modal card.

**Design tokens** (confirmed in `design-tokens.css`):
- `--ggv-gradient-arrived`: `linear-gradient(135deg, rgba(80,170,97,0.8) 0%, rgba(52,211,153,0.75) 100%)` — currently 0.75-0.8 opacity
- `--ggv-color-overlay-bg`: `rgba(0,0,0,0.7)` — default overlay background (not used by arrived)
- `--ggv-radius-xl`: `1.5rem`, `--ggv-shadow-dialog`: deep shadow

**Responsive** (app.css:748):
- `@media (min-width: 641px)`: `.modal` gets `max-width: 400px` — will apply to both mini-modals. Combined with `align-items: center` on the overlay, both modals will center horizontally on wider screens.

### Files to Reference

| File | Purpose | Lines of Interest |
| ---- | ------- | ----------------- |
| `src/components/ArrivedOverlay.tsx` | Component to restructure — 85 LOC, single modal | Full file |
| `src/styles/app.css:137-162` | `.overlay` + `.modal` base classes | Layout + box model |
| `src/styles/app.css:243-249` | `.overlay-description` class | `margin-bottom` to override |
| `src/styles/app.css:480-539` | Arrived-specific CSS overrides | All arrived classes |
| `src/lib/animations.ts` | `overlayVariants` + `modalVariants` — 18 LOC, will grow to ~46 LOC | Full file |
| `src/styles/design-tokens.css:78-82` | `--ggv-gradient-arrived` token | Opacity values |
| `src/App.tsx:362-437` | `AnimatePresence` wrapping all overlays | Render context |

### Technical Decisions

1. **Reuse `.modal` base class on the top mini-modal only** — the top modal gets `className="modal arrived-modal arrived-top-modal"` for surface bg, rounded corners, shadow, and green accent bar `::before`. The bottom modal gets `className="modal arrived-bottom-modal"` (without `arrived-modal`) so it gets the `.modal` base styling but NOT the green accent bar — an accent bar on a buttons-only card serves no UX purpose and adds visual noise.
2. **New animation variants** in `animations.ts` — `slideFromTopVariants` and `slideFromBottomVariants` with explicit spring transitions on BOTH `visible` AND `exit` states (consistent easing throughout). File grows from 18 to ~46 LOC.
3. **Parent exit transition delay** — `overlayVariants.exit` gets an explicit `transition: { delay: 0.15 }` so the backdrop fade-out waits for the children's slide-out animations to begin before fading. Without this, the parent's instant opacity fade would hide the slide-out animations.
4. **CSS-driven positioning** — override `.arrived-overlay` to use `flex-direction: column; justify-content: space-between; align-items: center; overflow: hidden`. Using `align-items: center` (not `stretch`) ensures modals respect `max-width: 400px` and center properly on desktop. `overflow: hidden` prevents visual artifacts during slide animations.
5. **New design token** `--ggv-gradient-arrived-veil` in `design-tokens.css` — same green gradient but at ~0.25 opacity, used by `.arrived-overlay` instead of the opaque version.
6. **No changes to component props/API** — `ArrivedOverlay` keeps the same interface (`destination`, `onNavigateAgain`, `onExitVillage`), only internal JSX restructure.
7. **Safe area padding on the overlay container** — both `padding-top` and `padding-bottom` on `.arrived-overlay` use `env(safe-area-inset-top/bottom)`. This ensures the modal cards themselves stay within safe bounds on iOS, rather than putting safe-area padding inside the modals (which would leave the card background overlapping the system UI).
8. **Tall device UX**: On very tall phones (e.g. Galaxy S21 Ultra 6.8"), `space-between` creates a large gap between the two modals. This is **intentional and desirable** — the whole purpose of the split layout is to maximize map visibility. More screen height = more map visible. The gap IS the feature.

## Implementation Plan

### Tasks

Tasks are ordered by dependency (lowest-level changes first):

- [x] **Task 1: Add design token for arrived veil backdrop**
  - File: `src/styles/design-tokens.css`
  - Action: Add `--ggv-gradient-arrived-veil` token after existing `--ggv-gradient-arrived` (line 82)
  - Value: `linear-gradient(135deg, rgba(80, 170, 97, 0.25) 0%, rgba(52, 211, 153, 0.2) 100%)`
  - Notes: Same green hues as `--ggv-gradient-arrived` but alpha reduced from 0.75-0.8 to 0.2-0.25. This creates a subtle green tint that lets the map show through clearly.

- [x] **Task 2: Add slide animation variants and update overlay exit timing**
  - File: `src/lib/animations.ts`
  - Action A: Export two new `Variants` objects after existing `modalVariants`:
    - `slideFromTopVariants`:
      ```ts
      hidden: { y: "-100%", opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 200 } },
      exit: { y: "-100%", opacity: 0, transition: { type: "spring", damping: 25, stiffness: 200 } }
      ```
    - `slideFromBottomVariants`:
      ```ts
      hidden: { y: "100%", opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 200 } },
      exit: { y: "100%", opacity: 0, transition: { type: "spring", damping: 25, stiffness: 200 } }
      ```
  - Action B: Update `overlayVariants.exit` to add a delay so the backdrop doesn't fade out before children start sliding:
    ```ts
    exit: { opacity: 0, transition: { delay: 0.15 } }
    ```
  - Notes: Uses percentage-based `y` values so the slide distance adapts to the modal's actual height. Spring damping matches existing `modalVariants` for consistency. Stiffness of 200 gives a snappy but not jarring feel. **Both entry and exit use the same spring** for consistent easing (fixes inconsistency where default tween would be used on exit). The `overlayVariants.exit` delay gives children ~150ms head start to begin sliding out before the backdrop starts fading. File grows from 18 LOC to ~46 LOC.

- [x] **Task 3: Add CSS for split arrived layout**
  - File: `src/styles/app.css`
  - Action: Replace/extend the arrived overlay CSS section (lines 480-539) with:
    1. Override `.arrived-overlay`:
       ```css
       .arrived-overlay {
         background: var(--ggv-gradient-arrived-veil);
         flex-direction: column;
         justify-content: space-between;
         align-items: center;
         overflow: hidden;
         padding: var(--ggv-space-lg) var(--ggv-space-md);
         padding-top: calc(var(--ggv-space-lg) + env(safe-area-inset-top, 0px));
         padding-bottom: calc(var(--ggv-space-lg) + env(safe-area-inset-bottom, 0px));
       }
       ```
       Key points:
       - `align-items: center` (NOT `stretch`) — ensures modals respect `max-width: 400px` on desktop and center horizontally
       - `overflow: hidden` — prevents scrollbar flash / visual artifacts during slide animations when modals are offscreen
       - Both `padding-top` and `padding-bottom` include safe-area insets on the container (not inside the modals)
    2. Add `.arrived-top-modal` class:
       ```css
       .arrived-top-modal {
         /* width: 100% inherited from .modal is correct — fills available space up to max-width */
       }

       .arrived-top-modal .overlay-description {
         margin-bottom: 0;
       }
       ```
       Notes: The `.overlay-description` normally has `margin-bottom: var(--ggv-space-xl)` (2rem) for spacing before buttons. In the split layout, the description is the last element in the top modal — that 2rem margin creates dead space. Override to `0`.
    3. Add `.arrived-bottom-modal` class:
       ```css
       .arrived-bottom-modal {
         /* width: 100% inherited from .modal is correct */
       }

       .arrived-bottom-modal::before {
         display: none;
       }
       ```
       Notes: The bottom modal only contains buttons — the `::before` accent bar (inherited from `.modal`) serves no UX purpose here. Hide it explicitly.
    4. Keep all existing arrived-specific rules unchanged:
       - `.arrived-modal::before` — green accent bar (applies to top modal only now)
       - `.arrived-icon-wrapper` + `@keyframes success-bounce` — icon animation
       - `.arrived-icon-wrapper::after` + `@keyframes success-ring` — ring pulse
       - `.arrived-overlay .overlay-btn-primary` — `margin-bottom: 0.75rem` (still correct: primary button remains above secondary button in the bottom modal)
       - `.arrived-exit-icon` — exit button icon styling

  - Notes: The base `.modal` class provides `width: 100%` which makes both mini-modals fill the container width on mobile. At the `@media (min-width: 641px)` breakpoint, `.modal { max-width: 400px }` constrains them, and `align-items: center` on the overlay container centers them — this works correctly without any additional responsive overrides.

- [x] **Task 4: Restructure ArrivedOverlay component**
  - File: `src/components/ArrivedOverlay.tsx`
  - Action: Replace the single `<m.div className="modal arrived-modal">` with two `<m.div>` elements inside the existing overlay container:

    **Top mini-modal** (`className="modal arrived-modal arrived-top-modal"`):
    - `variants={slideFromTopVariants}` — do NOT add `initial`/`animate`/`exit` props (Framer Motion propagates state from parent automatically)
    - Contains: icon wrapper (SVG checkmark), `<h1>You've Arrived!</h1>`, tagalog subtitle, description paragraph

    **Bottom mini-modal** (`className="modal arrived-bottom-modal"`):
    - `variants={slideFromBottomVariants}` — do NOT add `initial`/`animate`/`exit` props
    - Note: does NOT have `arrived-modal` class (no accent bar on buttons-only card)
    - Contains: primary button ("Navigate Somewhere Else") + secondary button ("Exit Village")

    **Outer container** stays the same: `<m.div className="overlay arrived-overlay" variants={overlayVariants} initial="hidden" animate="visible" exit="exit">`

  - Import changes: Replace `import { overlayVariants, modalVariants }` with `import { overlayVariants, slideFromTopVariants, slideFromBottomVariants }`. **Remove `modalVariants`** from the import — it is no longer used in this component.
  - Notes: The overlay container declares `initial="hidden"`, `animate="visible"`, `exit="exit"`. Child `m.div` elements inherit these state names via Framer Motion's automatic variant propagation. Each child only needs a `variants` prop pointing to its respective slide variants. No nested `AnimatePresence` needed.

### Acceptance Criteria

- [ ] **AC 1**: Given the user has arrived at a destination, when the arrived overlay appears, then two separate modal cards are visible — one at the top of the screen and one at the bottom — with the map visible between them.

- [ ] **AC 2**: Given the arrived overlay is displayed, when the user looks at the top modal, then it contains the success checkmark icon (with bounce animation), the "You've Arrived!" title, the "(Nakarating ka na!)" tagalog subtitle, the destination description text, and a green accent bar at the top of the card.

- [ ] **AC 3**: Given the arrived overlay is displayed, when the user looks at the bottom modal, then it contains the "Navigate Somewhere Else" primary button and the "Exit Village" secondary button, with no accent bar at the top.

- [ ] **AC 4**: Given the arrived overlay is displayed, when the user looks at the area between the two modals, then the map is visible through a light green semi-transparent veil, and the user can see their position dot and the destination marker.

- [ ] **AC 5**: Given the arrived overlay is transitioning in, when the animation plays, then the top modal slides in from above the screen and the bottom modal slides in from below the screen, both with spring easing.

- [ ] **AC 6**: Given the arrived overlay is transitioning out (user taps a button), when the exit animation plays, then the top modal slides up and the bottom modal slides down (both with spring easing), and the backdrop starts fading out slightly after the slide-out begins (~150ms delay).

- [ ] **AC 7**: Given the user taps "Navigate Somewhere Else" on the bottom modal, when the button is pressed, then `onNavigateAgain` is called (same behavior as before).

- [ ] **AC 8**: Given the user taps "Exit Village" on the bottom modal, when the button is pressed, then `onExitVillage` is called (same behavior as before).

- [ ] **AC 9**: Given the arrived overlay is displayed on an iOS device with a notch/dynamic island, when the top modal is positioned, then it does not overlap with the system status bar area (safe area inset respected via overlay container padding).

- [ ] **AC 10**: Given the arrived overlay is displayed on a device with a bottom home indicator (iPhone without home button), when the bottom modal is positioned, then it does not overlap with the home indicator area (safe area inset bottom respected via overlay container padding).

- [ ] **AC 11**: Given the arrived overlay is displayed on a wide screen (≥641px), when the modals render, then both are constrained to max-width 400px and centered horizontally.

## Additional Context

### Dependencies

No new dependencies. All changes use:
- Existing Framer Motion `m` component + `Variants` type (already imported)
- CSS custom properties (existing design token system)
- `env(safe-area-inset-top/bottom)` (native CSS, no polyfill needed — already supported by target browsers)

### Testing Strategy

Manual testing on real devices (no automated tests in this project):

**Android Chrome (primary):**
- [ ] Two modals appear at top and bottom
- [ ] Map visible between modals with light green veil
- [ ] Slide-in animations are smooth spring (no jank)
- [ ] Slide-out animations are visible before backdrop fades
- [ ] Success icon bounce animation plays
- [ ] Both buttons work correctly
- [ ] No overflow / scrollbar artifacts during slide animations
- [ ] No overlap with status bar

**iOS Safari (secondary):**
- [ ] Same visual checks as Android
- [ ] Top modal clears notch/dynamic island (safe area)
- [ ] Bottom modal clears home indicator (safe area)
- [ ] Spring animations perform well (no frame drops)

**Desktop browser (dev only):**
- [ ] ESLint passes: `bun run lint`
- [ ] Build succeeds: `bun run build`
- [ ] Visual check at various viewport widths
- [ ] `@media (min-width: 641px)` breakpoint: modals constrained to 400px and centered horizontally

### Notes

- **Risk: veil opacity too light or too dark** — The 0.2-0.25 alpha values are a starting estimate. May need visual tuning on real device. Easy to adjust by changing the single `--ggv-gradient-arrived-veil` token.
- **Accent bar design choice**: The top modal keeps the green accent bar (`arrived-modal` class) for visual continuity with other overlays. The bottom modal hides it via `.arrived-bottom-modal::before { display: none }` because an accent bar on a buttons-only card adds visual noise without purpose.
- **AnimatePresence mode="wait"** in App.tsx ensures the previous overlay fully exits before the arrived overlay enters — no z-index or overlap concerns.
- **No pointer-events consideration needed** — the backdrop `.arrived-overlay` covers the full screen and will still intercept touches. The map is visible but not interactive during the arrived state, which is correct behavior (user must choose an action).
- **Tall devices**: On very tall phones, `space-between` creates a large gap between modals. This is intentional — the gap IS the feature, maximizing map visibility.
- **Framer Motion propagation**: Child `m.div` elements do NOT need `initial`/`animate`/`exit` props. They inherit state from the parent via Framer Motion's automatic variant propagation as long as the variant keys match (`hidden`, `visible`, `exit`). Do NOT add a nested `AnimatePresence`.
