# Migration Supabase → Convex — MyGGV GPS

**Date :** 2026-07-21
**Version :** 5.0.0 (tag `v5.0.0`)
**Branche :** `feat/convex-migration` → merge fast-forward sur `main`
**Statut :** livré en production et vérifié end-to-end

> Manifeste de référence : ce que fait l'app, pourquoi la migration, ce qui a
> changé, et où regarder dans 6 mois.

---

## 1. Contexte & problème

MyGGV GPS est une **PWA web** (React 19 + MapLibre GL 5 + Vite 8) de navigation
GPS pour Garden Grove Village (Cavite, Philippines). Elle guide un visiteur du
portail jusqu'à un lot, sans install ni signup (scan QR → géoloc → destination
→ navigation).

La donnée (liste des blocks, lots + coordonnées pour le sélecteur de
destination) venait de **Supabase** via 2 RPC (`get_blocks`,
`get_lots_by_block`). Décision de Charles : **Supabase sera décommissionné**.
L'app mobile MyGGV (Expo) a déjà migré vers **Convex** ; le backend Convex
contient déjà la donnée du village dans la table `locations`.

**Objectif :** faire du GPS un **client pur** du backend Convex partagé de
MyGGV — aucune donnée dupliquée, aucune fonction propre déployée par le GPS.

---

## 2. Décisions d'architecture

- **GPS = client du backend MyGGV**, pas un projet Convex autonome. La donnée
  du village vit dans la table `locations` du backend mobile ; le GPS s'y
  branche en lecture.
- **Références cross-repo via `anyApi`** (`convex/server`) : le GPS et le
  backend sont dans deux repos séparés, donc pas d'`api` généré typé côté GPS.
  On appelle `anyApi.locations.blocks` / `anyApi.locations.lotsWithCoordsByBlock`
  (non typé, assumé).
- **Une query dédiée ajoutée au backend** plutôt que dériver les 1696 lots :
  `lotsWithCoordsByBlock({ block })` renvoie `{ lot, coordinates: {lng, lat} }[]`
  filtré/trié, calqué sur l'ancienne RPC `get_lots_by_block`.
- **Sélection de lot dérivée au render** (pas de `setState` dans un effet) —
  `effectiveLot = selectedLot || lotList[0]?.lot` (best practice React).
- **Multi-env Vite** : `.env` = déploiement **dev** (local), `.env.production`
  (committé, non secret) = déploiement **prod**. Le build prod embarque l'URL
  prod, le dev local reste isolé.

---

## 3. Incident backend & résolution (transparence)

Au démarrage, un `convex dev` lancé depuis le repo GPS a **écrasé le
déploiement dev partagé** `academic-panda-488` (schéma/fonctions minimalistes
du GPS poussés par-dessus le backend MyGGV complet).

**Résolution :** redéploiement depuis le repo source `~/Bureau/myggv`
(`convex dev --once`) → **178 fonctions + composants restaurés**. Les **données
n'ont jamais été perdues** (Convex ne supprime pas les tables sur changement de
schéma). Leçon actée : le GPS ne doit **jamais** pousser de schéma/fonctions ;
il consomme l'existant.

---

## 4. Ce qui a changé

### Backend MyGGV (`~/Bureau/myggv`, source de vérité)

- `convex/locations.ts` : **+ `lotsWithCoordsByBlock({ block })`**
  (commit `65ee23c`).
- Déployé en **prod** `elegant-dalmatian-876` via `convex deploy`
  (dry-run préalable : diffs schéma/composants/auth vides → additif, sûr).

### Repo GPS (`new-ggv-gps`)

| Fichier                             | Changement                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/main.tsx`                      | `ConvexProvider` + `ConvexReactClient(VITE_CONVEX_URL)`                                                  |
| `src/App.tsx`                       | `useQuery(anyApi.locations.blocks)` (remplace RPC `get_blocks`)                                          |
| `src/components/WelcomeOverlay.tsx` | `useQuery(anyApi.locations.lotsWithCoordsByBlock, …)`, sélection dérivée                                 |
| `src/vite-env.d.ts`                 | type `ImportMetaEnv.VITE_CONVEX_URL`                                                                     |
| `index.html`                        | CSP `connect-src` → `*.convex.cloud` + `wss:` + `demotiles`; `style-src 'unsafe-inline'` (framer-motion) |
| `.env.production`                   | **nouveau** — URL Convex prod (build prod)                                                               |
| `.env.example`                      | Supabase → Convex                                                                                        |
| `src/sw.ts`                         | suppression de la route service-worker Supabase                                                          |
| **supprimés**                       | `@supabase/supabase-js`, `src/lib/supabase.ts`, `src/types/blocks.ts`, `App.tsx.backup`                  |

---

## 5. Commits & tags (`main`)

| Hash      | Message                                                                |
| --------- | ---------------------------------------------------------------------- |
| `73ff910` | feat: migrate data layer from Supabase to Convex                       |
| `fba09bf` | chore: post-audit hardening                                            |
| `c6d0f13` | style: format App.tsx with prettier                                    |
| `e5e4b20` | docs: add quality audit report (2026-07-21)                            |
| `f4402ba` | **5.0.0** (tag `v5.0.0`)                                               |
| `9c49d3e` | ci: pin GitHub Actions to commit SHAs (semgrep supply-chain hardening) |

Backend (repo `~/Bureau/myggv`) : `65ee23c feat(locations): add lotsWithCoordsByBlock query for GPS app`.

---

## 6. Durcissement (audit qualité du 2026-07-21)

- **CI `deploy.yml`** : secrets Supabase morts retirés (clé ORS conservée).
- **CI `quality.yml` + `deploy.yml`** : 6 actions GitHub épinglées à des **SHAs
  40-car** (`checkout`, `setup-bun`, `FTP-Deploy`) — corrige le finding semgrep
  `github-actions-mutable-action-tag` (pré-existant, exposé par dérive de règles).
- **`.gitignore`** : ignore `.codegraph/` et `.ua/` (caches d'outils).
- **`public/.htaccess`** : HSTS activé (`max-age=1an; includeSubDomains`),
  `X-XSS-Protection` → `0` (header déprécié).
- **DNS Hostinger** (`charlesbourgault.com`) : DMARC `p=none` → `p=quarantine` ;
  AAAA (IPv6) ajouté sur `myggvgps` ; CAA `letsencrypt.org` (CA vérifiée avant
  verrouillage).
- **Branche morte** `refactor/simplify-architecture` supprimée (local + remote).

---

## 7. État production (vérifié end-to-end)

- **URL :** https://myggvgps.charlesbourgault.com (deploy FTP via GitHub Actions
  sur push `main`).
- **Backend prod :** `elegant-dalmatian-876.eu-west-1.convex.cloud` —
  `locations.blocks` (41 blocks), `lotsWithCoordsByBlock` (coords OK).
- **CI verte :** Code Quality (lint / prettier / typecheck / 39 tests / semgrep)
  - Deploy — les deux `success`.
- **Smoke navigateur sur la vraie prod :** Enable GPS → 41 blocks → Block 1 →
  14 lots avec coords → Navigate actif. 0 erreur console, 0 erreur CSP.
- **Headers servis :** HTTP 200, HSTS actif, `X-XSS-Protection: 0`, CSP avec
  `*.convex.cloud`/`wss:`/`demotiles`/`unsafe-inline`, bundle pointant sur
  Convex prod.

---

## 8. Follow-ups & limitations connues

- **`~/Bureau/myggv`** : le commit `65ee23c` (query GPS) est **committé
  localement mais pas poussé** sur `origin/main` (la prod Convex l'a déjà via
  `convex deploy`). Du travail non commité y traîne aussi (`businesses.ts`,
  `onboarding.ts`). À pousser/committer côté ce repo pour éviter le drift
  GitHub ↔ Convex.
- **Glyphs offline** : les labels de carte viennent du CDN `demotiles.maplibre.org`
  (autorisé en CSP). L'offline-first complet (self-host des `.pbf`) reste un
  chantier séparé.
- **`deploy.yml`** re-déploie à chaque push `main`, y compris changements
  docs/CI (rebuild + FTP identiques). Ajouter un `paths-ignore` si gênant.
- **CSP `style-src 'unsafe-inline'`** : requis par framer-motion (styles inline
  dynamiques). Compromis standard pour hébergement statique (pas de nonce
  par-requête possible).
- **Références cross-repo non typées** (`anyApi`) : si la signature de
  `lotsWithCoordsByBlock` ou `blocks` change côté backend, aucune erreur de
  compilation côté GPS — à surveiller manuellement.
