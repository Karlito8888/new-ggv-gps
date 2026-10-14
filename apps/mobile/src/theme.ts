/**
 * Token values copied from apps/web/src/styles/design-tokens.css (the colour-role rules of
 * AGENTS.md § Couleurs apply unchanged): brand-coloured text uses `primaryText`, never the
 * decorative `--ggv-color-primary` fill, which mobile has no use for.
 */
export const theme = {
  primaryText: "#326b3d",
  cta: "#3b7d47",
  onCta: "#ffffff",
  surface: "#f4f4f4",
  text: "#121212",
  glass: "rgba(255,255,255,0.85)",
  overlay: "rgba(0,0,0,0.7)",
  error: "#ef4444",
  gray: "#6b7280",
  radiusModal: 16,
  radiusPill: 999,
  font: "Madimi One",
  /** The logo sits at the top centre of every screen; overlays stack below it. */
  logoTop: 48,
  logoHeight: 48,
} as const;
