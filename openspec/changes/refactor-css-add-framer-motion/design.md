# Design: CSS Refactoring and Framer Motion Integration

## Context

MyGGV GPS is a mobile-first React application for GPS navigation. The UI consists of:
- Map view (MapLibre GL)
- Modal dialogs (permission requests, welcome, arrival)
- Navigation display overlay
- Map control buttons
- Header/Footer layout

The current CSS architecture uses CSS Modules for component isolation but has accumulated duplication over time.

## Goals

1. **Reduce CSS duplication** by 50%+ through centralization
2. **Improve maintainability** with single sources of truth for design tokens
3. **Add polished animations** that enhance UX without being distracting
4. **Maintain performance** on mobile devices

## Non-Goals

- Complete CSS-in-JS migration (keep CSS Modules)
- Dark mode support (out of scope)
- Desktop-specific responsive design (mobile-only app)

## Decisions

### Decision 1: Centralize CSS Variables in `index.css`

**What**: Add all design tokens (shadows, animations, typography) as CSS custom properties in `:root`

**Why**: 
- Single source of truth
- Easy to update globally
- CSS variables are well-supported in target browsers
- No build-time overhead

**Alternatives considered**:
- Sass/SCSS variables: Requires build tool changes, not needed for this scope
- CSS-in-JS (styled-components): Too heavy for this refactor, different paradigm

### Decision 2: Create Dedicated Animation Files

**What**: New `src/styles/animations.css` containing all `@keyframes` definitions

**Why**:
- Single place to find/modify animations
- Prevents duplicate keyframe definitions
- Can be imported once globally

**Structure**:
```css
/* src/styles/animations.css */
@keyframes spin { ... }
@keyframes pulse { ... }
@keyframes fadeIn { ... }
@keyframes fadeOut { ... }
@keyframes slideIn { ... }
@keyframes slideOut { ... }
@keyframes scaleIn { ... }
@keyframes scaleOut { ... }
@keyframes bounceIn { ... }
```

### Decision 3: Shadow System via CSS Variables

**What**: Define shadow scale in `:root` variables

**Why**:
- Consistent elevation system
- Easy to adjust globally
- Semantic naming (soft, medium, strong, dialog)

**Implementation**:
```css
:root {
  --shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.15);
  --shadow-strong: 0 8px 25px rgba(0, 0, 0, 0.2);
  --shadow-dialog: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --shadow-button: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --text-shadow-default: 1px 1px 2px rgba(0, 0, 0, 0.3);
}
```

### Decision 4: Framer Motion for React Animations

**What**: Use Framer Motion library for component animations

**Why**:
- Declarative animation API integrates well with React
- Hardware-accelerated transforms
- Gesture support (tap, drag) built-in
- AnimatePresence handles exit animations
- Smaller than alternatives (GSAP)

**Alternatives considered**:
- Pure CSS animations: Already have, but limited for complex interactions
- React Spring: Similar size, less intuitive API
- GSAP: Overkill, larger bundle, imperative API

### Decision 5: Animation Variants Architecture

**What**: Create reusable Framer Motion variants in `src/lib/animations.js`

**Why**:
- Consistent animation behavior across app
- Easy to modify animation feel globally
- Reduces code duplication in components

**Structure**:
```javascript
// src/lib/animations.js
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 10 }
};

export const buttonTapVariants = {
  tap: { scale: 0.95 },
  hover: { scale: 1.02 }
};

export const spinnerVariants = {
  animate: { 
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};
```

### Decision 6: Gradual Migration Approach

**What**: Migrate animations incrementally, not all at once

**Why**:
- Reduces risk of breaking changes
- Allows testing each component individually
- CSS fallbacks remain during transition

**Order of migration**:
1. Modal overlays (highest impact)
2. Buttons (tap feedback)
3. Loading states
4. Navigation transitions

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase (~30KB) | Medium | Acceptable for UX improvement; tree-shaking reduces actual size |
| Animation performance on low-end devices | Low | Use `transform` and `opacity` only; disable animations if needed |
| CSS variable browser support | None | Full support in Chrome 49+ and Safari 10+ (our targets) |
| Breaking existing styles | Low | Keep CSS modules isolated; test visually |

## Migration Plan

1. **Phase 1 - CSS Variables**: Add variables to `index.css`, no breaking changes
2. **Phase 2 - Centralize Keyframes**: Create `animations.css`, import globally
3. **Phase 3 - Update Modules**: Replace hardcoded values with variables
4. **Phase 4 - Install Framer Motion**: Add dependency
5. **Phase 5 - Create Variants**: Add `src/lib/animations.js`
6. **Phase 6 - Migrate Components**: Update modals, buttons, overlays

## Open Questions

None - scope is well-defined for CSS refactoring and animation enhancement.
