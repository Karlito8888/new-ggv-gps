import type { LayerSpecification, StyleSpecification } from "@maplibre/maplibre-react-native";
import type { MapAssetUrls } from "./mapAssets";

/**
 * The protomaps layers name three font stacks with spaces. On disk they are aliases without
 * spaces, so a `file://` glyph URL never depends on percent-encoding.
 */
const FONT_ALIASES: Record<string, string> = {
  "Noto Sans Regular": "noto-sans-regular",
  "Noto Sans Medium": "noto-sans-medium",
  "Noto Sans Italic": "noto-sans-italic",
};

/** JSON round-trip: replaces the exact quoted stack names wherever they appear, expressions included. */
function renameFontStacks(layers: LayerSpecification[]): LayerSpecification[] {
  let json = JSON.stringify(layers);
  for (const [stack, alias] of Object.entries(FONT_ALIASES)) {
    json = json.replaceAll(`"${stack}"`, `"${alias}"`);
  }
  return JSON.parse(json);
}

export function buildMobileStyle(
  urls: MapAssetUrls,
  layers: LayerSpecification[]
): StyleSpecification {
  return {
    version: 8,
    glyphs: urls.glyphsUrl,
    sprite: urls.spriteUrl,
    sources: {
      protomaps: {
        type: "vector",
        url: urls.tilesUrl,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: renameFontStacks(layers),
  };
}
