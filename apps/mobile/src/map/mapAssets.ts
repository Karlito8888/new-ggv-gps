import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import { TILESET_FILE } from "@ggv/shared";

/**
 * Everything the map reads at runtime ships inside the app, so the map works fully offline from
 * the first install. MapLibre Native reads plain `file://` paths, not bundle assets, hence this
 * module copies each asset once into the document directory.
 *
 * This is the only place mobile reads web-owned assets (tileset, sprites) by relative path.
 *
 * `asset://` is not an option for the `.pmtiles` file: maplibre-native#4360 is unfixed in released
 * Android builds.
 */

/** Bump to re-copy every asset on the next launch (the old `map-*` directory is deleted). */
// 2: the copy became atomic (staging + rename); a 1 left by an interrupted copy may be truncated.
const MAP_ASSETS_VERSION = 2;

type Entry = { path: string; asset: number } | { path: string; json: object };

// Static requires: Metro resolves them at bundle time.
const ENTRIES: Entry[] = [
  // Rename together with TILESET_FILE (packages/shared/src/tileset.ts).
  {
    path: `tiles/${TILESET_FILE}`,
    asset: require("../../../web/public/tiles/ggv-20261013.pmtiles"),
  },
  // Byte copies of apps/web/public/sprites/light{,@2x}.png (keep in step with them): Metro reads
  // the `@2x` suffix as a density variant of `light.png`, so `light@2x.png` cannot be required
  // by name. The JSON sprites below carry no such suffix problem (they are modules, not assets).
  { path: "sprites/light.png", asset: require("../../assets/map/sprites/light-1x.png") },
  { path: "sprites/light@2x.png", asset: require("../../assets/map/sprites/light-2x.png") },
  { path: "sprites/light.json", json: require("../../../web/public/sprites/light.json") },
  { path: "sprites/light@2x.json", json: require("../../../web/public/sprites/light@2x.json") },
  ...glyphs("noto-sans-regular", [
    require("../../assets/map/fonts/noto-sans-regular/0-255.pbf"),
    require("../../assets/map/fonts/noto-sans-regular/256-511.pbf"),
    require("../../assets/map/fonts/noto-sans-regular/8192-8447.pbf"),
  ]),
  ...glyphs("noto-sans-medium", [
    require("../../assets/map/fonts/noto-sans-medium/0-255.pbf"),
    require("../../assets/map/fonts/noto-sans-medium/256-511.pbf"),
    require("../../assets/map/fonts/noto-sans-medium/8192-8447.pbf"),
  ]),
  ...glyphs("noto-sans-italic", [
    require("../../assets/map/fonts/noto-sans-italic/0-255.pbf"),
    require("../../assets/map/fonts/noto-sans-italic/256-511.pbf"),
    require("../../assets/map/fonts/noto-sans-italic/8192-8447.pbf"),
  ]),
];

/** The three glyph ranges every font stack ships, in the order they are required above. */
function glyphs(alias: string, modules: number[]): Entry[] {
  const ranges = ["0-255", "256-511", "8192-8447"];
  return modules.map((asset, i) => ({ path: `fonts/${alias}/${ranges[i]}.pbf`, asset }));
}

export interface MapAssetUrls {
  tilesUrl: string;
  spriteUrl: string;
  glyphsUrl: string;
}

export async function ensureMapAssets(): Promise<MapAssetUrls> {
  const rootName = `map-${MAP_ASSETS_VERSION}`;
  const root = new Directory(Paths.document, rootName);

  // A bumped version, or a staging directory left by an interrupted copy, is reclaimed here.
  for (const entry of Paths.document.list()) {
    if (entry instanceof Directory && entry.name.startsWith("map-") && entry.name !== rootName) {
      entry.delete();
    }
  }

  // Build in a staging directory and rename it last: `map-<v>` exists only once complete, so a
  // copy interrupted by a kill or a full disk is redone on the next launch instead of leaving a
  // truncated tileset that would pass an `exists` test forever.
  if (!root.exists) {
    const staging = new Directory(Paths.document, `${rootName}.tmp`);
    for (const entry of ENTRIES) {
      const target = new File(staging, entry.path);
      target.parentDirectory.create({ intermediates: true, idempotent: true });
      if ("json" in entry) {
        target.write(JSON.stringify(entry.json));
      } else {
        const [asset] = await Asset.loadAsync(entry.asset);
        if (!asset.localUri) throw new Error(`map asset ${entry.path} has no local file`);
        new File(asset.localUri).copy(target);
      }
    }
    staging.rename(rootName);
  }

  return {
    tilesUrl: `pmtiles://${new File(root, `tiles/${TILESET_FILE}`).uri}`,
    spriteUrl: new File(root, "sprites/light").uri,
    glyphsUrl: `${root.uri.replace(/\/+$/, "")}/fonts/{fontstack}/{range}.pbf`,
  };
}
