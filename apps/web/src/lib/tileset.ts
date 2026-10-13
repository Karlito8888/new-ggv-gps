// The village tileset, read by the map style and warm-cached by the service worker.
// The file name (and why it carries a build date) lives in @ggv/shared.
import { TILESET_FILE } from "@ggv/shared";

export const TILESET_PATH = `/tiles/${TILESET_FILE}`;
