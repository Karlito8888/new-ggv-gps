/// <reference types="node" />
/**
 * Snapshot of the village (blocks and the lots that have coordinates), bundled into the app so
 * the Welcome screen works with no network. Regenerate when the village data changes:
 *
 *   bun run snapshot:lots
 *
 * Reads the same two public Convex queries as the web app (see AGENTS.md § Backend externe).
 */
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { hasCoords, type LotData } from "@ggv/shared";
import { CONVEX_URL } from "../src/config";

const client = new ConvexHttpClient(CONVEX_URL);

const blocks = (await client.query(anyApi.locations.blocks, {})) as string[];
// `anyApi` is untyped: an empty or reshaped answer must not replace the committed snapshot.
if (!Array.isArray(blocks) || blocks.length === 0) {
  throw new Error("refusing to write a snapshot: blocks is not a non-empty array");
}
const lotsByBlock: Record<string, LotData[]> = {};
for (const block of blocks) {
  const lots = (await client.query(anyApi.locations.lotsWithCoordsByBlock, {
    block,
  })) as LotData[];
  lotsByBlock[block] = lots.filter(hasCoords);
}
const total = Object.values(lotsByBlock).reduce((n, l) => n + l.length, 0);
if (total === 0) throw new Error("refusing to write a snapshot with zero lots");

const out = new URL("../assets/data/village-snapshot.json", import.meta.url);
writeFileSync(
  out,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), blocks, lotsByBlock })}\n`
);
console.info(`${blocks.length} blocks, ${total} lots -> ${out.pathname}`);
