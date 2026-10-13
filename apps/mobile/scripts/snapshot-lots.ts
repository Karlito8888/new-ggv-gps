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
import { isCoord, type LotData } from "@ggv/shared";
import { CONVEX_URL } from "../src/config";

const client = new ConvexHttpClient(CONVEX_URL);

const blocks = (await client.query(anyApi.locations.blocks, {})) as string[];
const lotsByBlock: Record<string, LotData[]> = {};
for (const block of blocks) {
  const lots = (await client.query(anyApi.locations.lotsWithCoordsByBlock, {
    block,
  })) as LotData[];
  // Same filter as useDestinationChoice: a lot without usable coordinates cannot be navigated to.
  lotsByBlock[block] = lots.filter(
    (l) => isCoord(l?.coordinates?.lng) && isCoord(l?.coordinates?.lat)
  );
}

const out = new URL("../assets/data/village-snapshot.json", import.meta.url);
writeFileSync(
  out,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), blocks, lotsByBlock })}\n`
);
console.info(
  `${blocks.length} blocks, ${Object.values(lotsByBlock).reduce((n, l) => n + l.length, 0)} lots -> ${out.pathname}`
);
