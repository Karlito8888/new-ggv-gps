/**
 * Token values copied from apps/web/src/styles/design-tokens.css (the colour-role rules of
 * AGENTS.md § Couleurs apply unchanged): brand-coloured text uses `primaryText`, never the
 * decorative `--ggv-color-primary` fill, which only appears inside the gradients below.
 */
export const theme = {
  primaryText: "#326b3d",
  cta: "#3b7d47",
  onCta: "#ffffff",
  surface: "#f4f4f4",
  text: "#121212",
  /** `.overlay-description`: secondary text dimmed by colour, never by opacity. */
  textMuted: "rgba(18,18,18,0.72)",
  textTint: "rgba(18,18,18,0.08)",
  glass: "rgba(255,255,255,0.85)",
  overlay: "rgba(10,16,12,0.64)",
  error: "#ef4444",
  gray: "#6b7280",
  gradient: {
    cta: "linear-gradient(135deg, #3b7d47, #295c34)",
    brand: "linear-gradient(135deg, #50aa61, #f3c549)",
    success: "linear-gradient(135deg, #50aa61, #34d399)",
    exit: "linear-gradient(135deg, #f3c549, #fbbf24)",
    error: "linear-gradient(135deg, #ef4444, #f3c549)",
  },
  shadow: {
    card: "0 24px 48px -16px rgba(0,0,0,0.45)",
    disc: "0 8px 20px rgba(0,0,0,0.16)",
    button: "0 6px 16px rgba(41,92,52,0.28)",
    pill: "0 2px 12px rgba(0,0,0,0.15)",
  },
  radiusCard: 24,
  radiusField: 16,
  radiusPill: 999,
  /** Madimi One: titles, buttons, numbers. Body text and fields use the system face. */
  font: "Madimi One",
  /** The logo sits at the top centre of every screen; overlays stack below it. */
  logoTop: 48,
  logoHeight: 48,
} as const;
