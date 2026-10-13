// The village tileset, read by the map style and warm-cached by the service worker.
//
// The file name carries its Protomaps build date because `.htaccess` serves `*.pmtiles` with
// `max-age=31536000, immutable`: under a fixed name a browser keeps its old copy for a year, and
// so does the worker's `cache.add`, which reads through the HTTP cache. A new extract therefore
// gets a new name here and in `public/tiles/`, never an overwrite.
export const TILESET_PATH = "/tiles/ggv-20261013.pmtiles";
