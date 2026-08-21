# AGENTS.md — new-ggv-gps

**Le projet en une phrase :** PWA React (pas d'Expo, pas de React Native) de navigation GPS dans
Garden Grove Village (Philippines), servie sans install/inscription via QR code à l'entrée du
village, MapLibre GL JS natif.

## Ce qui n'est PAS ici

| Quoi                                                                                                                                                      | Où                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Règles de travail générales — vérifier avant d'affirmer, DRY/KISS/YAGNI, périmètre, échelle de doc officielle, outils obligatoires, git, accord explicite | `~/.omp/agent/RULES.md`            |
| Le poste, les graphes de code, les workflows                                                                                                              | `~/.omp/agent/AGENTS.md`           |
| Faits durables du projet — versions, gate mesuré, dettes, points ouverts                                                                                  | `~/.omp/agent/bank/new-ggv-gps.md` |

## Stack — web uniquement

Vite `^8.1.5` · React `^19.2.7` · Convex `^1.42.3` (client seul, `convex/react`) · `maplibre-gl`
`^5.24.0` (bibliothèque **web** de MapLibre, pas le binding React Native) · TypeScript `^5.9.3` ·
`vite-plugin-pwa` (Workbox) pour le mode hors-ligne.

## ⚠️ Backend externe : ce dépôt n'en possède pas

Il n'y a **aucun dossier `convex/` ici**. `src/main.tsx` ouvre un `ConvexProvider`
**non authentifié** vers le déploiement Convex de **`~/Bureau/myggv`** :

```ts
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
```

Deux fonctions publiques de myggv sont appelées, en `anyApi` (pas de types générés localement,
donc `tsc` ne peut pas attraper une signature qui change côté serveur) :

- `anyApi.locations.blocks` — `src/App.tsx`, liste des blocs du village.
- `anyApi.locations.lotsWithCoordsByBlock` — `src/components/WelcomeOverlay.tsx`, lots + coords
  d'un bloc (`useQuery(..., selectedBlock ? { block } : "skip")`).

**Si `myggv/convex/locations.ts` ajoute une garde d'authentification sur l'une de ces deux
fonctions**, cette app casse en silence : les `useQuery` restent indéfiniment `undefined`
(pas d'erreur visible, juste un écran de sélection de bloc vide) puisqu'il n'y a ici ni Clerk
ni aucun `ConvexProviderWithAuth`. `myggv/AGENTS.md` documente déjà cette dépendance dans l'autre
sens — les deux fichiers doivent rester synchronisés si l'une des deux queries change de nom ou
de contrat.

`VITE_CONVEX_URL` pointe le déploiement **production** de myggv (`.env.production`, committé —
ce n'est pas un secret, juste une URL d'endpoint ; le build CI (`deploy.yml`) le charge donc sans
avoir besoin de le passer en variable GitHub).

## Machine à états de navigation — 4 états

`src/App.tsx`, un seul `useState`, pas de router :

```
gps-permission → welcome → navigating → exit-complete
```

Pas d'état `orientation-permission` : la caméra n'utilise plus le compas de l'appareil.
`useCourseUpCamera` (`src/hooks/useCourseUpCamera.ts`) dérive le cap de la **direction GPS**
(`GeolocationCoordinates.heading`, lissée par `nextBearing` dans `src/lib/course.ts`), pas d'un
capteur d'orientation — robuste sur Android/Samsung/iOS sans permission compas à demander.
L'arrivée n'est pas un état : `showArrivedModal` flotte par-dessus `"navigating"`, la carte reste
interactive (GPS, caméra course-up et gestes continuent).

## Routing — 3 tentatives en cascade (`src/lib/routing.ts` + `src/hooks/useRouting.ts`)

1. **OSRM** `router.project-osrm.org` — primaire.
2. **OSRM** `routing.openstreetmap.de/routed-foot` (FOSSGIS) — même API v1, donc `parseManeuver`
   et `OSRMResponse` couvrent les deux ; `OSRM_HOSTS` porte la liste, l'ordre fait la cascade.
3. **Ligne directe** — dernier recours (cap seul).

**Le routage ne consomme aucune clé d'API**, donc aucun secret CI : les deux hôtes sont publics.

Recalcul si l'utilisateur bouge de plus de `RECALC_THRESHOLD_M`, immédiat si la destination
change, débounce `DEBOUNCE_MS` sur les positions GPS. Une fois retombé sur la ligne directe, le
tracé ne remonte d'un palier qu'au prochain recalcul (pas de retry en arrière-plan). Seuil
d'arrivée : `ARRIVAL_THRESHOLD_M` (15 m) dans `useNavigation.ts`.

## Gate

```bash
bun run gate
```

= `tsc --noEmit && bun run lint && bun run format:check && bun run test` (vitest). Vert, ~9 s —
mais **4 fichiers de test seulement**, dans `src/__tests__/` (`course`, `geo`, `navigation`,
`routing`) : ils couvrent les fonctions pures de `src/lib/`, **rien** de `App.tsx`,
`useMapSetup.ts`, `useRouting.ts` (l'effet, pas la fonction pure), `useCourseUpCamera.ts` ni
`fetchWithTimeout`. Un test vert ne prouve pas que la navigation ou la requête Convex
fonctionnent réellement — testé manuellement sur Chrome Android / Safari iOS.

`.prettierignore` doit garder `archon-out/` et `flow-out/` : ces dossiers portent leur propre
`.gitignore` (`*`) que prettier ne lit jamais — sans ces lignes le gate rougit sur les rapports
d'audit.

**Vérifier dans un navigateur exige de purger le service worker d'abord.** `bun run preview`
sert `dist/`, mais la PWA précache ses assets : un onglet qui a déjà visité l'app rejoue
l'**ancien** bundle depuis `workbox-precache-v2-*`, sans le dire. La mesure porte alors sur la
version précédente. Avant chaque contrôle :

```js
for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
```

Puis recharger. Le symptôme quand on l'oublie : des valeurs qui appartiennent à du code
qu'on vient de supprimer.

## Déploiement

`deploy.yml` (push sur `main`) : `bun run build` → FTP vers Hostinger
(`myggvgps.charlesbourgault.com`, LiteSpeed, `public/.htaccess` gère le SPA fallback et les
en-têtes de sécurité). `quality.yml` fait tourner le gate plus un scan Semgrep
(`p/owasp-top-ten`, `p/security-audit`, `p/typescript`, `p/react`) sur chaque push/PR vers `main`.

## Bibliothèques interdites (vérifié absentes du code)

`react-map-gl`, `@turf/turf`, `react-router-dom`, `Context`/`Redux`/`Zustand` — 100 % MapLibre
natif, état local (`useState`), pas de gestion d'état globale.

**Aucune bibliothèque d'animation** non plus. Les animations d'entrée sont des `@keyframes`
CSS dans `app.css`, dont les trois courbes de ressort (`--ggv-spring-modal|slide|pill`) sont
les anciens ressorts framer-motion portés à l'identique en `linear()`. Il n'y a **pas**
d'animation de sortie : elle exigerait `@starting-style`, absent du Safari 16.4 que
`target: "esnext"` inclut encore. `@media (prefers-reduced-motion: reduce)` (`app.css`) les
neutralise toutes.

## Langues

- **Communication avec le dev** : français.
- **Contenu de l'app** : anglais **+ traduction tagalog courte** (public : résidents philippins
  de Garden Grove Village), ex. `<h1>Enable Location</h1><p>(I-enable ang Lokasyon)</p>`.

## Données du village

`VILLAGE_CENTER` (`useMapSetup.ts`) et `VILLAGE_EXIT` (`App.tsx`) sont des coordonnées codées en
dur, pas lues depuis Convex. `src/data/blocks.ts` porte 62 points-étiquettes (`blockLabels`,
un centroïde par bloc) qui alimentent la seule couche `block-labels` — aucun contour n'est
dessiné. La liste des blocs et lots vient, elle, de Convex (voir plus haut) : deux sources de
vérité pour la géométrie village, à garder synchronisées à la main.
