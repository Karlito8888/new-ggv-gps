import type { LotData } from "@ggv/shared";
import snapshot from "../assets/data/village-snapshot.json";

/** Bundled copy of the village's blocks and lots (regenerate: `bun run snapshot:lots`). */
export const villageSnapshot = snapshot as {
  generatedAt: string;
  blocks: string[];
  lotsByBlock: Record<string, LotData[]>;
};
