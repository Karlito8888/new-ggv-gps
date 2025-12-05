# Change: Refactor CSS (KISS/DRY) and Add Framer Motion Animations

## Why

The current CSS codebase has accumulated technical debt with duplicated patterns across multiple files:
- **3 duplicate `@keyframes spin`** definitions (modal-base, orientationToggle, mapLoadingOverlay)
- **3 duplicate `@keyframes pulse`** definitions
- **Repeated shadow values** (same `box-shadow` patterns in 6+ files)
- **Repeated text-shadow patterns** (identical `1px 1px 2px rgba(0,0,0,0.3)` in 8+ places)
- **Font-family declarations** duplicated instead of using CSS variables
- **Animation definitions scattered** across component files instead of centralized

Additionally, the app lacks polished micro-interactions. Framer Motion would provide:
- Smooth page/modal transitions
- Button press feedback
- Route state change animations
- Loading state animations

## What Changes

### CSS Refactoring (KISS/DRY)
- Create centralized `animations.css` for all `@keyframes` definitions
- Create `shadows.css` with CSS custom properties for shadow patterns
- Consolidate repeated patterns into CSS variables in `index.css`
- Remove duplicate declarations across component modules
- Simplify overly complex selectors

### Framer Motion Integration
- Add `framer-motion` dependency
- Create reusable animation variants for common patterns
- Add page transition animations (modal open/close)
- Add button interaction animations (tap, hover)
- Add loading/spinner animations
- Add route change transitions

## Impact

- **Affected specs**: None (visual/UX enhancement only)
- **Affected code**:
  - `src/styles/index.css` - Add centralized variables
  - `src/styles/animations.css` - New file for keyframes
  - `src/styles/shadows.css` - New file for shadow variables
  - `src/components/ui/modal-base.module.css` - Remove duplicates, use variables
  - `src/components/orientationToggle.module.css` - Remove duplicates
  - `src/components/mapLoadingOverlay.module.css` - Remove duplicates
  - `src/components/ui/select.module.css` - Simplify animations
  - `src/components/MapControls/mapControls.module.css` - Use shadow variables
  - `src/components/navigationDisplay.module.css` - Use shadow variables
  - `src/components/mapMarkers.module.css` - Use shadow variables
  - `src/components/Footer/footer.module.css` - Use font variable
  - React components using modals, buttons, navigation states

## Risk Assessment

- **Low risk**: CSS changes are visual only, no logic changes
- **Bundle size**: Framer Motion adds ~30KB gzipped (acceptable for UX benefit)
- **Performance**: Framer Motion uses hardware-accelerated transforms
- **Browser support**: Full support for Chrome Android and Safari iOS (target browsers)
