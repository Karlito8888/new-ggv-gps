/**
 * Token values copied from apps/web/src/styles/design-tokens.css (Signpost: opaque paper cards,
 * green street signs, a sun-yellow road diamond). Text contrast is computed against paper or sign
 * green only; `sun` is a fill, never text.
 */
export const theme = {
  primaryText: "#326b3d",
  /** Sign green: the CTA, plates and the turn sign. */
  cta: "#1f5a2e",
  onCta: "#ffffff",
  /** Tagalog on sign green. */
  onCtaGloss: "#cfe8d3",
  sun: "#f3c549",
  /** Paper: cards, chips, strip. */
  surface: "#f7f5f0",
  text: "#161a17",
  /** `.overlay-description`: secondary text dimmed by colour, never by opacity. */
  textMuted: "rgba(22,26,23,0.72)",
  /** Eyebrow, notes, version, ⓘ. */
  muted: "#5d625e",
  hairline: "rgba(22,26,23,0.06)",
  outline: "rgba(22,26,23,0.18)",
  dashed: "rgba(22,26,23,0.3)",
  /** The white rule inset in every street sign. */
  signRule: "rgba(255,255,255,0.9)",
  /** The basemap `background` layer: the page before tiles draw. */
  map: "#cccccc",
  error: "#ef4444",
  /** The paper fade behind every bottom card. */
  fade: "linear-gradient(to top, rgba(247,245,240,0.9) 20%, rgba(247,245,240,0) 58%)",
  shadow: {
    card: "0 24px 60px -16px rgba(40,36,20,0.4)",
    chip: "0 6px 16px rgba(40,36,20,0.16)",
    sign: "0 10px 22px -10px rgba(31,90,46,0.7)",
    diamond: "0 12px 24px -8px rgba(0,0,0,0.35)",
  },
  radiusCard: 32,
  radiusSign: 18,
  radiusPill: 999,
  /** Madimi One: titles, buttons, numbers. Body text and fields use the system face. */
  font: "Madimi One",
  /** The logo chip sits at the top centre; overlays stack below it. Hidden while navigating. */
  logoTop: 48,
  logoHeight: 44,
} as const;
