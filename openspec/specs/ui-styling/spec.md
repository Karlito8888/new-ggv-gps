# ui-styling Specification

## Purpose
TBD - created by archiving change refactor-css-add-framer-motion. Update Purpose after archive.
## Requirements
### Requirement: Centralized CSS Design Tokens

The application SHALL define all design tokens as CSS custom properties in a single location (`:root` in `index.css`).

#### Scenario: Shadow tokens available globally
- **WHEN** any component needs a shadow effect
- **THEN** it SHALL use one of the predefined shadow variables (--shadow-soft, --shadow-medium, --shadow-strong, --shadow-dialog, --shadow-button)

#### Scenario: Text shadow consistency
- **WHEN** any component needs text shadow for legibility
- **THEN** it SHALL use the --text-shadow-default variable

#### Scenario: Typography consistency
- **WHEN** any component needs the primary font
- **THEN** it SHALL use the --font-primary variable instead of hardcoding font-family

---

### Requirement: Centralized CSS Animations

The application SHALL define all @keyframes animations in a single dedicated file (`animations.css`).

#### Scenario: Spin animation usage
- **WHEN** a component needs a spinning animation (loaders, icons)
- **THEN** it SHALL reference the global `spin` keyframe, not define its own

#### Scenario: Pulse animation usage
- **WHEN** a component needs a pulsing animation
- **THEN** it SHALL reference the global `pulse` keyframe, not define its own

#### Scenario: Fade animations usage
- **WHEN** a component needs fade in/out animations
- **THEN** it SHALL reference the global `fadeIn`/`fadeOut` keyframes

#### Scenario: Slide animations usage
- **WHEN** a component needs slide animations
- **THEN** it SHALL reference the global `slideInFromTop`, `slideInFromBottom`, `slideInFromLeft`, `slideInFromRight` keyframes

---

### Requirement: Framer Motion Animation Variants

The application SHALL provide reusable Framer Motion animation variants in a centralized location (`src/lib/animations.js`).

#### Scenario: Modal animation
- **WHEN** a modal dialog opens or closes
- **THEN** it SHALL use the `modalVariants` for consistent enter/exit animations with spring physics

#### Scenario: Button tap feedback
- **WHEN** a user taps an interactive button
- **THEN** the button SHALL scale down slightly (0.95) to provide tactile feedback using `buttonTapVariants`

#### Scenario: Fade transition
- **WHEN** content needs to fade in or out
- **THEN** it SHALL use `fadeVariants` for consistent opacity transitions

#### Scenario: Loading spinner
- **WHEN** a loading spinner is displayed
- **THEN** it SHALL use `spinnerVariants` for smooth continuous rotation

---

### Requirement: Modal Animation Enhancement

Modal dialogs SHALL use Framer Motion for smooth open/close animations.

#### Scenario: Modal opening animation
- **WHEN** a modal is triggered to open
- **THEN** the overlay SHALL fade in AND the content SHALL scale up with spring physics

#### Scenario: Modal closing animation
- **WHEN** a modal is dismissed
- **THEN** the content SHALL scale down and fade out smoothly before unmounting

#### Scenario: AnimatePresence wrapper
- **WHEN** modal visibility changes
- **THEN** AnimatePresence SHALL handle exit animations before component unmounts

---

### Requirement: Interactive Button Animation

Interactive buttons SHALL provide visual feedback on user interaction.

#### Scenario: Button press feedback
- **WHEN** user presses (touch or click) an interactive button
- **THEN** the button SHALL animate to 95% scale during press

#### Scenario: Button release feedback
- **WHEN** user releases an interactive button
- **THEN** the button SHALL animate back to 100% scale smoothly

---

### Requirement: Loading State Animation

Loading states SHALL use Framer Motion for smooth animations.

#### Scenario: Loading overlay appearance
- **WHEN** the map loading overlay appears
- **THEN** it SHALL fade in smoothly over 300ms

#### Scenario: Loading overlay disappearance
- **WHEN** the map finishes loading
- **THEN** the overlay SHALL fade out smoothly before unmounting

#### Scenario: Spinner animation
- **WHEN** a spinner is displayed
- **THEN** it SHALL rotate continuously using hardware-accelerated transforms

