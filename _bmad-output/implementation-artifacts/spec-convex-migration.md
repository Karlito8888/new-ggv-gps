---
status: draft
slug: convex-migration
goal: Migrate the GPS destination-picker data layer from Supabase to Convex
created: 2026-07-21
owner: Charles
---

# Spec: Migrate data layer from Supabase to Convex

## Context

`new-ggv-gps` uses Supabase only as a data source for the destination picker, via two RPCs behind a lazy client (`src/lib/supabase.ts`):

- `get_blocks()` → `{ name: string }[]` (41 blocks)
- `get_lots_by_block({ block_name })` → `{ lot: string, coordinates: { lng, lat } | null }[]`

The Supabase project will be shut down. This migration re-points those two reads to Convex (project `myggv-dev`, dev deployment `elegant-dalmatian-876`, team `charles-bourgault`) with no change to the map/navigation logic. Static map polygons in `src/data/blocks.ts` are unrelated and stay.

Data already snapshotted from the live Supabase (`.ua/tmp/supabase-snapshot.json`): **41 blocks, 1696 lots, 100% with valid coordinates, 0 nulls.**

## Non-goals

- No change to routing, MapLibre setup, orientation, or navigation state machine.
- No fix of unrelated audit findings (tracked separately in `AUDIT-2026-07-21.md`).
- Not migrating `src/data/blocks.ts` (build-time map layer, not Supabase-sourced).

## Data model (Convex)

`convex/schema.ts`:

- `blocks` table: `{ name: v.string() }` — seeded in Supabase order (preserves picker ordering).
- `lots` table: `{ block: v.string(), lot: v.string(), lng: v.number(), lat: v.number() }`, index `by_block` on `["block"]` — seeded in Supabase order (preserves per-block lot ordering; first lot stays the UI default).

Rationale: a dedicated `blocks` table keeps `list` O(41) instead of scanning 1696 lots. Coordinates flattened to `lng`/`lat` (all non-null in snapshot), re-nested to `{ lng, lat }` at the query boundary to keep the client `LotData` shape unchanged.

## Functions (Convex)

- `convex/blocks.ts` → `list` query: returns `string[]` of block names in stored order.
- `convex/lots.ts` → `byBlock` query, args `{ block: v.string() }`: returns `{ lot, coordinates: { lng, lat } }[]` for that block via the `by_block` index (stored order).

## Client integration

- `src/main.tsx`: wrap `<App/>` in `<ConvexProvider client={new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)}>`.
- `src/App.tsx`: replace the two `supabase.rpc("get_blocks")` calls + manual `blocks`/`isLoadingBlocks`/`blocksError`/`retryLoadBlocks` machinery with `const blocks = useQuery(api.blocks.list)`. Loading = `blocks === undefined`. Convex auto-retries on reconnect, so the manual retry button/error state is dropped; `WelcomeOverlay` props simplified accordingly.
- `src/components/WelcomeOverlay.tsx`: replace the `get_lots_by_block` effect with `useQuery(api.lots.byBlock, selectedBlock ? { block: selectedBlock } : "skip")`. Derive `lots`/`isLoadingLots` from the hook; keep first-lot preselection and `[lng,lat]` destination mapping. Remove the `ignore`-flag concern (useQuery handles staleness).

## Removals (clean cutover)

- `bun remove @supabase/supabase-js`; delete `src/lib/supabase.ts`.
- Remove `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` from `.env` and `.env.example`; add `VITE_CONVEX_URL`.
- Delete the dead Supabase SW route (`src/sw.ts:57-68`, `supabase-data` cache).
- Update the `Block` type comment in `src/types/blocks.ts` (no longer "Supabase RPC").

## Tasks (ordered)

1. `bun add convex`.
2. Write `convex/schema.ts` (blocks, lots + `by_block`).
3. Write `convex/blocks.ts` (`list`) and `convex/lots.ts` (`byBlock`).
4. Link + push dev deployment: `bunx convex dev --once --configure existing --team charles-bourgault --project myggv-dev` (writes `.env.local` `CONVEX_DEPLOYMENT`, sets `VITE_CONVEX_URL`).
5. Seed: emit `blocks.jsonl` + `lots.jsonl` from the snapshot, `bunx convex import --table blocks blocks.jsonl -y` and `--table lots lots.jsonl -y`.
6. `src/main.tsx`: ConvexProvider.
7. `src/App.tsx`: `useQuery(api.blocks.list)`, drop manual state/retry.
8. `src/components/WelcomeOverlay.tsx`: `useQuery(api.lots.byBlock, …)`.
9. Removals (Supabase dep/lib/env/SW route/type comment).
10. Verify: `tsc`, `eslint`, `vitest`, `vite build`, + smoke (dev server: picker lists 41 blocks, lots load, Navigate sets destination).

## Acceptance criteria

- **AC1 — Blocks.** Given the app loads, When the welcome overlay mounts, Then the block dropdown lists all 41 blocks sourced from Convex, and no request hits `*.supabase.co`.
- **AC2 — Lots.** Given a block is selected, When its lots resolve from Convex, Then the lot dropdown lists that block's lots with the first preselected, and Navigate sets the destination to `[lng, lat]`.
- **AC3 — Clean cutover.** Given the repo, Then no `@supabase/supabase-js` import, no `VITE_SUPABASE_*` usage, and no Supabase SW route remain; `tsc`, `eslint`, `vitest` (39), and `vite build` all pass.
- **AC4 — Reactive client.** Given `VITE_CONVEX_URL` is configured, Then data flows through `useQuery`, a loading state shows while results are `undefined`, and the app renders without Convex/console errors.

## Risks / notes

- **Loading/error model shift:** Convex `useQuery` returns `undefined` while loading and auto-retries; there is no per-call error callback like Supabase's `{ error }`. The manual retry button is removed by design. Query failures surface via the existing `ErrorBoundary`.
- **Online requirement:** live Convex queries need a connection — same as the current Supabase picker (whose SW POST cache was already dead), so no offline regression for the picker. Map tiles/assets remain offline via the SW.
- **Deployment link:** step 4 may require interactive login/project selection; if the existing token doesn't cover it non-interactively, Charles runs that one command in his terminal.
- **Rollback:** work isolated on branch `feat/convex-migration`; Supabase snapshot retained until Convex verified.
