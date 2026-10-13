// The village tileset file name, read by both renderers.
//
// The name carries its Protomaps build date because web's `.htaccess` serves `*.pmtiles` with
// `max-age=31536000, immutable`: under a fixed name a browser keeps its old copy for a year, and
// so does the worker's `cache.add`, which reads through the HTTP cache. A new extract therefore
// gets a new name here and in `apps/web/public/tiles/`, never an overwrite. Mobile requires the
// file by relative path (apps/mobile/src/map/mapAssets.ts): rename it there too.
export const TILESET_FILE = "ggv-20261013.pmtiles";
