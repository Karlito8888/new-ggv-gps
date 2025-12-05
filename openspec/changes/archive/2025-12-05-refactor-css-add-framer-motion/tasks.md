# Tasks: CSS Refactoring and Framer Motion Integration

## 1. CSS Variables Centralization

- [x] 1.1 Add shadow CSS variables to `src/styles/index.css` (--shadow-soft, --shadow-medium, --shadow-strong, --shadow-dialog, --shadow-button, --text-shadow-default)
- [x] 1.2 Add typography CSS variable for font-family (--font-primary)
- [x] 1.3 Add transition duration variables (--transition-fast, --transition-normal, --transition-slow)

## 2. Centralize CSS Animations

- [x] 2.1 Create `src/styles/animations.css` with all @keyframes definitions (spin, pulse, fadeIn, fadeOut, slideIn variants, scaleIn, scaleOut, bounceIn)
- [x] 2.2 Import `animations.css` in `main.jsx`
- [x] 2.3 Remove duplicate @keyframes from `modal-base.module.css`
- [x] 2.4 Remove duplicate @keyframes from `orientationToggle.module.css`
- [x] 2.5 Remove duplicate @keyframes from `mapLoadingOverlay.module.css`
- [x] 2.6 Remove duplicate @keyframes from `select.module.css`

## 3. Update Component CSS Modules to Use Variables

- [x] 3.1 Update `modal-base.module.css` to use shadow and text-shadow variables
- [x] 3.2 Update `navigationDisplay.module.css` to use shadow variables
- [x] 3.3 Update `mapMarkers.module.css` to use shadow variables
- [x] 3.4 Update `orientationToggle.module.css` to use shadow variables
- [x] 3.5 Update `select.module.css` to use shadow variables
- [x] 3.6 Update `mapControls.module.css` to use shadow variables
- [x] 3.7 Update `footer.module.css` to use font-family variable

## 4. Install and Configure Framer Motion

- [x] 4.1 Install framer-motion package (`npm install framer-motion`)
- [x] 4.2 Create `src/lib/animations.js` with reusable animation variants (fade, slideUp, scale, modal, buttonTap, spinner)

## 5. Add Framer Motion to Modal Components

- [x] 5.1 Wrap modal overlay with AnimatePresence in modal components
- [x] 5.2 Add motion.div with modalVariants to dialog content
- [x] 5.3 Add fade animation to overlay background

## 6. Add Framer Motion to Interactive Elements

- [x] 6.1 Create `AnimatedButton` wrapper component with tap animation
- [x] 6.2 Update map control buttons to use tap animation (scale on press)
- [x] 6.3 Add subtle hover/tap feedback to orientation toggle button

## 7. Add Framer Motion to Loading States

- [x] 7.1 Replace CSS spinner animation with Framer Motion in MapLoadingOverlay
- [x] 7.2 Add smooth fade-in/out for loading overlay appearance

## 8. Add Page Transition Animations

- [x] 8.1 Add AnimatePresence wrapper for navigation state transitions
- [x] 8.2 Create smooth transitions between navigation states (gps-permission → welcome → navigating → arrived)

## 9. Validation and Testing

- [x] 9.1 Run `npm run build` to verify no CSS errors
- [x] 9.2 Test all modal animations on mobile viewport
- [x] 9.3 Verify button tap feedback works on touch devices
- [x] 9.4 Check loading animations render smoothly
- [x] 9.5 Verify no visual regressions in navigation display
