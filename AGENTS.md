# AGENTS.md — new-ggv-gps

**Le projet en une phrase :** navigation GPS dans Garden Grove Village (Philippines), en deux
clients : une PWA React (`apps/web`, MapLibre GL JS natif, servie sans install via QR code à
l'entrée du village) et une app native Expo / React Native (`apps/mobile`, carte 100 % hors ligne).

## Monorepo layout (Bun workspaces, hoisted linker)

| Path              | What                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------- |
| `apps/web`        | The PWA. Everything below that says `src/…` without a prefix lives in `apps/web/src/`.  |
| `apps/mobile`     | Expo SDK 57 app, `com.myggv.gps` (+ `.dev`, `.preview` variants via `APP_VARIANT`).     |
| `packages/shared` | `@ggv/shared`: platform-neutral navigation core, runs on web and React Native (Hermes). |
| `design`          | `icon.svg`, the app icon master; `render-icons.sh` writes all mobile and web icons.     |
| repo root         | `scripts/`, CI, `vite.config.ts` (Vite+ lint and format), `bunfig.toml`, this file.     |

`@ggv/shared` holds what both renderers share: `useNavigationFlow` (the 4-state machine),
`useRouting` (OSRM cascade; the abort/generation contract below and its test live here),
`useCourseUpCamera` (behind a `CameraDriver` interface), `useDestinationChoice`, `turnGuidance`,
`COPY` (all user-visible strings), `map/layers.ts` (paint/layout of the app's own layers) and the
basemap layers JSON (`@ggv/shared/basemap-layers`). Moved files, old to new: `lib/geo.ts`,
`lib/course.ts`, `lib/trace.ts`, `hooks/useNavigation.ts` (now `arrival.ts`), `hooks/useRouting.ts`,
`hooks/useCourseUpCamera.ts`, `types/*`, `data/blocks.ts` → `packages/shared/src/`;
`lib/routing.ts` is split: pure half in shared `routing.ts`, map drawing in
`apps/web/src/lib/routeLayers.ts`. Shared code must not touch `window`/`document`/`navigator`/
`location` (Oxlint `no-restricted-globals`, root `vite.config.ts`) and must not read `import.meta.env`.

Root scripts fan out: `bun run gate` = typecheck + lint + format check + tests of shared, web and
mobile. `apps/web` deploys by FTP on pushes to `main` that touch `apps/web`, `packages/shared`,
`package.json`, `bun.lock` or `bunfig.toml`. `bunfig.toml` pins `minimumReleaseAge` (Semgrep
gate): a fresh release that cannot wait goes in `minimumReleaseAgeExcludes`, for that package only.

Web and shared tooling is **Vite+** (`vite-plus`, `vp` CLI): Vite, Rolldown, Vitest, Oxlint and
Oxfmt at the versions `vite-plus` pins exactly. The root `vite.config.ts` holds the `lint` and
`fmt` blocks for the whole repo; `apps/web/vite.config.ts` keeps the build and test config. `vite`
resolves to `@voidzero-dev/vite-plus-core` through the root `catalog` and `overrides`: bump
`vite-plus` and that alias together. A `vite-plus` release pins tool versions published days
before it, so it clears `minimumReleaseAge` only when its whole tree does: check every package,
not only `vite-plus`. Lint is type-aware (`typeAware` + `typeCheck`), which also type-checks files
`tsc` skips, such as `vite.config.ts`. The mobile app stays on ESLint through `expo lint` and its
own `apps/mobile/eslint.config.js`: `vp migrate` deletes that config and its dependencies, restore
them after any re-run.

## Mobile app (`apps/mobile`)

- **Map assets ship in the app** and are copied once to `Paths.document/map-<version>/` by
  `src/map/mapAssets.ts` (MapLibre Native reads `file://`, not bundle assets; `asset://` is broken
  for `.pmtiles` on Android, maplibre-native#4360). Tileset, sprite JSONs: relative requires into
  `apps/web/public`. Sprite PNGs and glyph PBFs are copies under `apps/mobile/assets/map/`
  (Metro reads `light@2x.png` as a density variant of `light.png`). Bump `MAP_ASSETS_VERSION` when
  they change; rename the tileset `require` together with `TILESET_FILE`.
- **Village snapshot** (`assets/data/village-snapshot.json`): blocks and lots with coordinates,
  so Welcome works offline. Regenerate with `bun run snapshot:lots` (reads the same two public
  Convex queries as web). OSRM stays online; offline falls back to the direct line.
- **Block and lot selectors** (`src/select/`) are the web `<select>` of `WelcomeOverlay`: the
  closed field is React Native with the `.welcome-select` values (`SelectField.tsx`), and the
  menu it opens is native through `@expo/ui` (≥ 57.0.23), a Compose `DropdownMenu` on Android
  (`Select.android.tsx`) and a SwiftUI `Menu` on iOS (`Select.ios.tsx`), both taking the field as
  trigger via `RNHostView matchContents={{ vertical: true }}` (width from the host, height from
  the field). `Select.d.ts` gives `tsc` the platform-resolved module. Placeholder and `enabled`
  conditions copy the web line for line; the placeholder is never an option. Android menu facts,
  from the shipped `DropdownMenu.kt`: the `modifiers` prop lands on the trigger `Box`, not the
  menu; Material sizes the menu on its content's intrinsic width (a `fillMaxWidth` there is
  zero), so the items `Column` gets a fixed `width` measured on the outer `View`; Material drops
  the menu below the field only if it fits above the navigation bar, else centres it on the
  field, which is why `MENU_HEIGHT` is 200 dp. `@expo/ui` 57.0.22 crashes on any numeric
  `width()` modifier (`FieldCastException`, expo/expo#51322), hence the `bunfig.toml` exclusion.
  A Compose `Host` follows the device colour scheme unless `colorScheme="light"`. iOS not yet seen.
- **Metro in this monorepo** serves bundles under `/apps/mobile/…`: fetch the launch URL from
  the manifest (`curl -H "expo-platform: android" localhost:<port>/ | jq .launchAsset.url`), not
  `/index.bundle`. Use a dedicated port (`expo start --dev-client --port 8082`): other projects on
  this machine hold 8081, and a dev client pointed at the wrong Metro loads the wrong app.
- **Testing on the Android emulator** (`ggv-phone`, created with `avdmanager`): start it with
  `-gpu host`. With `swiftshader_indirect` MapLibre Native draws no symbol layer at all (no
  labels, no route arrows). Scripted GPS: `adb -s emulator-5554 emu geo fix <lng> <lat>` once per
  second. Airplane mode: `adb shell cmd connectivity airplane-mode enable`. The first location
  request shows Google's "Location Accuracy" dialog. A debug dev-client build holds a screen
  wake lock by itself, and `stay_on_while_plugged_in` defaults to on: judge keep-awake on a
  release build with `settings put global stay_on_while_plugged_in 0`.
- `expo-location` is requested in foreground only (no background keys): the plugin's default
  "Always" and motion purpose strings are set to `false`, so the only iOS location key is
  `NSLocationWhenInUseUsageDescription`. Approximate location (iOS "Precise: Off", Android
  "Approximate") is refused with a Settings button: `useDeviceLocation` returns `"approximate"`.
  `android.blockedPermissions` removes the prebuild template's `SYSTEM_ALERT_WINDOW` and storage
  permissions. Test the approximate path on a device with
  `pm revoke <pkg> android.permission.ACCESS_FINE_LOCATION` while coarse stays granted.
- Sentry project `myggv-gps` (org `charles-bourgault`, region `de`); events are sent from
  release builds only.

## Ce qui n'est PAS ici

| Quoi                                                                                                                                                      | Où                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Règles de travail générales — vérifier avant d'affirmer, DRY/KISS/YAGNI, périmètre, échelle de doc officielle, outils obligatoires, git, accord explicite | `~/.omp/agent/RULES.md`            |
| Le poste, les graphes de code, les workflows                                                                                                              | `~/.omp/agent/AGENTS.md`           |
| Faits durables du projet — versions, gate mesuré, dettes, points ouverts                                                                                  | `~/.omp/agent/bank/new-ggv-gps.md` |

## Stack — web (`apps/web`)

Vite+ `1.1.0` (Vite `8.3.3`, Vitest `5.0.3`) · React `19.2.3` (exact pin) · Convex `^1.42.3` (client seul, `convex/react`) · `maplibre-gl`
`^5.24.0` (bibliothèque **web** de MapLibre, pas le binding React Native) · TypeScript `~6.0.3` ·
`vite-plugin-pwa` (Workbox) pour le mode hors-ligne.

`src/vite-env.d.ts` ne fait que **référencer** les types livrés par les paquets — `vite/client`
(qui déclare déjà `*.png` et `*.mp3`) et `vite-plugin-pwa/react` (qui déclare
`virtual:pwa-register/react`). ⚠️ Ne pas y redéclarer ces modules « pour le mode strict » :
cohabiter avec la déclaration du paquet la duplique. Si un import d'asset ne typecheck pas, la
cause est ailleurs.

## ⚠️ Backend externe : ce dépôt n'en possède pas

Il n'y a **aucun dossier `convex/` ici**. `src/main.tsx` ouvre un `ConvexProvider`
**non authentifié** vers le déploiement Convex de **`~/Bureau/myggv`**. La construction du client
est **gardée** : `new ConvexReactClient(undefined)` lève au niveau module, donc **avant** le
premier `render()` — l'`ErrorBoundary` n'est alors jamais monté et l'utilisateur voit un écran
blanc. C'est la pire panne possible pour une app qu'on entre en scannant un QR code, d'où le
`try` :

```ts
let convex: ConvexReactClient;
try {
  convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
} catch (error) {
  root.render(/* markup statique bilingue « Configuration error » */);
  throw error;
}
```

Une URL malformée mais plausible n'a, elle, pas besoin de garde : elle lève plus tard depuis le
`get sync()` paresseux, pendant le render, là où l'`ErrorBoundary` l'attrape.

Deux fonctions publiques de myggv sont appelées, en `anyApi` (pas de types générés localement,
donc `tsc` ne peut pas attraper une signature qui change côté serveur) :

- `anyApi.locations.blocks` — `src/App.tsx`, liste des blocs du village.
- `anyApi.locations.lotsWithCoordsByBlock` — `packages/shared/src/useDestinationChoice.ts`, lots + coords
  d'un bloc (`useQuery(..., selectedBlock ? { block } : "skip")`).

**Si `myggv/convex/locations.ts` ajoute une garde d'authentification sur l'une de ces deux
fonctions**, cette app casse — mais **bruyamment**, pas en silence : `requireIdentity` lève un
`ConvexError`, et `useQuery` **relance l'erreur depuis son call site** (`convex@1.42.3`,
`dist/esm/react/client.js:464-465` : `if (result instanceof Error) throw result;` — c'est aussi
ce que documente `docs.convex.dev/functions/error-handling.md`). L'`ErrorBoundary` de
`src/main.tsx` l'attrape donc et affiche « Something went wrong ». Convex ne réessaie jamais
une query en erreur : l'écran reste là jusqu'au rechargement.

La panne réellement **silencieuse** est ailleurs : un changement de _forme_ de la réponse. Comme
`anyApi` n'est pas typé, `tsc` ne le voit pas, et des coordonnées malformées deviendraient une
destination `[undefined, undefined]` que MapLibre comme l'URL OSRM avalent sans broncher. D'où le
filtre de `lotList` (`packages/shared/src/useDestinationChoice.ts`), qui renvoie ce cas vers le
chemin « No lots available » existant.

Côté myggv, l'ouverture de ces deux queries est **garantie par un test**, pas seulement par un
commentaire : `convex/authz.test.ts` les liste dans `OPEN` et les appelle sans identité
(`devrait rester publique`), et une vérification d'exhaustivité y interdit qu'une query exportée
échappe au classement. Ajouter `requireIdentity` sur l'une des deux fait donc **rougir la CI de
myggv** avant d'atteindre la production. Le contrat est aussi écrit dans le tableau de gardes en
tête de `convex/locations.ts` et dans les deux `AGENTS.md` de ce dépôt. Rien à ajouter là-bas :
ce qu'il faut, c'est garder les noms synchronisés si l'une des deux queries change de contrat.

`VITE_CONVEX_URL` pointe le déploiement **production** de myggv (`apps/web/.env.production`, committé —
ce n'est pas un secret, juste une URL d'endpoint ; le build CI (`deploy.yml`) le charge donc sans
avoir besoin de le passer en variable GitHub).

## Machine à états de navigation — 4 états

`packages/shared/src/useNavigationFlow.ts`, un seul `useState`, pas de router :

```
gps-permission → welcome → navigating → exit-complete
```

Pas d'état `orientation-permission` : la caméra n'utilise plus le compas de l'appareil.
`useCourseUpCamera` (`packages/shared/src/useCourseUpCamera.ts`) dérive le cap de la **direction GPS**
(`GeolocationCoordinates.heading`, lissée par `nextBearing` dans `packages/shared/src/course.ts`), pas d'un
capteur d'orientation — robuste sur Android/Samsung/iOS sans permission compas à demander.
L'arrivée n'est pas un état : `showArrivedModal` flotte par-dessus `"navigating"`, la carte reste
interactive (GPS, caméra course-up et gestes continuent).

## Routing — 3 tentatives en cascade (`packages/shared/src/routing.ts` + `useRouting.ts`)

1. **OSRM** `router.project-osrm.org` — primaire.
2. **OSRM** `routing.openstreetmap.de/routed-foot` (FOSSGIS) — même API v1, donc `parseManeuver`
   et `OSRMResponse` couvrent les deux ; `OSRM_HOSTS` porte la liste, l'ordre fait la cascade.
3. **Ligne directe** — dernier recours (cap seul).

**Le routage ne consomme aucune clé d'API**, donc aucun secret CI : les deux hôtes sont publics.

Recalcul si l'utilisateur bouge de plus de `RECALC_THRESHOLD_M` (30 m), immédiat si la
destination change. Une fois retombé sur la ligne directe, le tracé ne remonte d'un palier qu'au
prochain recalcul (pas de retry en arrière-plan). Seuil d'arrivée : `ARRIVAL_THRESHOLD_M` (15 m)
dans `arrival.ts`.

⚠️ **Aucun débounce, et surtout aucun `abort()` dans le cleanup de l'effet de `useRouting`.**
L'effet a `originLat`/`originLng` en dépendances, donc il se relance à **chaque** fix GPS, et
React exécute le cleanup précédent avant chaque relance — ce cleanup annulait donc la requête
OSRM que l'utilisateur attend, une fois par seconde, après quoi la garde des 30 m refusait d'en
lancer une nouvelle. Dès que l'aller-retour OSRM dépassait la cadence GPS, l'itinéraire
n'arrivait **jamais** : pas de trait, pas d'instruction, et même pas le repli ligne droite
(`signal.aborted` sort avant). Mesuré sur Galaxy A16, +1,5 s de latence : **zéro** log de route
en 20 s de navigation. Les réponses périmées sont déjà écartées par jeton de génération dans
`applyRoute` : le seul rôle de l'abort est de céder la place à un fetch plus récent, à l'arrêt de
la navigation, et au démontage. Le débounce de 500 ms est parti avec — réarmé par chaque fix, il
affame au-delà de 2 Hz, et le seuil de 30 m plafonne déjà la cadence des requêtes.

**Les couches de la carte sont créées une fois pour toutes dans le handler `load`**
(`addRouteLayers`, `addArrivalZoneLayer`), avec des données vides ; ensuite tout passe par
`setData`. C'est structurel, pas cosmétique : `addSource`/`addLayer` passent par `_checkLoaded()`
et lèvent « Style is not done loading. », `setData` **n'a aucune vérification d'état**. Deux
pièges vérifiés dans les sources installées de `maplibre-gl` 5.24 :

- `_checkLoaded()` teste `Style._loaded`, qui ne repasse **jamais** à faux — contrairement à
  `map.isStyleLoaded()`, qui lui inclut les tuiles. Un `addSource` ne peut donc échouer
  qu'**avant** le parse du style, ce que la garde `isMapReady` exclut déjà : diagnostiquer une
  ligne manquante par ce throw était une erreur.
- réessayer sur `map.once('idle')` **ne peut pas fonctionner en navigation** : `idle` exige
  « no camera transitions in progress » (JSDoc des typings), et `useCourseUpCamera` lance un
  `easeTo` de 1 s à chaque fix GPS.

Corollaire : ne jamais remettre un `if (!map.isStyleLoaded()) return;` devant un dessin. Il
transforme un échec bruyant en absence définitive et muette — c'est ce qui pouvait faire sauter
le pin de destination en même temps que son cercle d'arrivée.

## Gate

```bash
bun run gate
```

= typecheck (shared, web, mobile) + lint + `format:check` + tests vitest (shared, web ; mobile n'a
pas de tests). Vert, ~20 s, **51 tests** : 48 dans `packages/shared/src/__tests__/` (5 fichiers) et 3 dans
`apps/web/src/__tests__/routeLayers.test.ts`. Quatre fichiers shared couvrent les fonctions pures
(`arrival`, `course`, `geo`, `routing`) ; le cinquième, `useRouting.test.ts`, couvre
**l'effet** — c'est le seul test du dépôt qui monte un composant React.

Il tourne en **jsdom déclaré par fichier** (docblock `@vitest-environment jsdom`, documenté par
vitest) : la config globale reste en `node`, donc les quatre suites pures ne paient pas le
démarrage du DOM. `@testing-library/react` + `jsdom` sont là pour ce seul fichier, et c'est
assumé : la course à l'`abort` est partie en production **trois fois** sans qu'un test puisse la
voir.

⚠️ **Aucun timer dans ce test, ni réel ni simulé.** Le faux `fetch` renvoie son propre
`Promise.withResolvers`, donc « le réseau n'a pas encore répondu » est un **état** que le test
tient, pas un délai qu'il attend. Un test écrit avec des `setTimeout` mesurerait la charge de la
machine. Et il a été validé en **réintroduisant la panne** : `pending[0].aborted` et l'assertion
`setData` rougissent, puis reverdissent après revert. Un test qui n'a jamais échoué ne prouve
rien.

Restent sans test : `App.tsx`, `useMapSetup.ts` et `useCourseUpCamera.ts`. Un gate vert ne
prouve donc toujours pas que la navigation ou la requête Convex fonctionnent — contrôle réel sur
appareil, § suivant.

Report folders (`archon-out/`, `flow-out/`, `revue-out/`, `frise-out/`) carry their own `*`
`.gitignore`, and Oxfmt skips git-ignored files: they need no entry in `fmt.ignorePatterns`
(measured: an unformatted `.ts` dropped in `frise-out/` is not checked).

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

⚠️ **Vérifier sur le web ne dit RIEN de la PWA installée.** Le service worker sert le bundle
précaché : une correction en ligne peut être invisible dans l'app installée. Le seul protocole
correct est d'installer le SW depuis le build **précédent**, de publier le nouveau, puis de relancer.
Depuis `registerType: "autoUpdate"` + `self.skipWaiting()` (mesuré) : **1 relance** suffit, et la
montée depuis l'ancien worker demande **2 relances** sans aucun geste utilisateur.

⚠️ **`page.on('console')` ne capte RIEN dans cet outil navigateur** — mesuré 2026-08-23 avec un
`console.log` garanti : 0 message. Un « zéro erreur » obtenu par ce moyen ne prouve **rien**. Le seul
instrument vérifié est de patcher `console` **dans la page** avant le code applicatif, puis de lire
le tableau :

```js
await page.evaluateOnNewDocument(() => {
  window.__logs = [];
  for (const k of ["log", "info", "warn", "error"]) {
    const orig = console[k].bind(console);
    console[k] = (...a) => {
      window.__logs.push(k + ": " + a.join(" "));
      orig(...a);
    };
  }
});
// puis : await tab.evaluate(() => window.__logs)
```

Les événements **CDP** (`cdp.on('Network.webSocketCreated')`, etc.), eux, fonctionnent. Toujours
auto-tester l'instrument avant d'en tirer une conclusion négative.

**Tester hors ligne demande le service worker, pas un blocage d'URL.** `Network.setBlockedURLs`
n'intercepte **pas** l'upgrade WebSocket : bloquer `*convex.cloud*` laisse passer un
`handshake 101` et les 42 blocs arrivent quand même. Le seul dispositif correct est
`Network.emulateNetworkConditions { offline: true }`, **après** un chargement en ligne qui installe
le SW — sinon la coquille elle-même ne charge pas et aucun code applicatif ne tourne.
⚠️ Cette émulation est **collante** : la repasser à `offline: false` laisse l'onglet en
`ERR_INTERNET_DISCONNECTED`. Un onglet neuf par scénario, et **aucune conclusion sur la reconnexion
automatique** ne peut sortir de ce dispositif.

## Mesurer sur le téléphone — le seul instrument qui trouve les bugs de navigation

Le bug du tracé manquant est **invisible depuis un navigateur de bureau** : il faut un flux GPS.
Le poste pilote le téléphone via `adb` + CDP, et l'outil navigateur s'y attache par `cdp_url` :

```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote   # onglets Chrome ET PWA installée
curl -s http://localhost:9222/json/list | jq -r '.[]|[.type,.id,.url]|@tsv'
adb reverse tcp:5173 tcp:5173                               # servir un build local au téléphone
adb shell monkey -p org.chromium.webapk.aef3138b3cf6909f6_v2 -c android.intent.category.LAUNCHER 1
```

La PWA installée est un WebAPK (`org.chromium.webapk.aef3138b3cf6909f6_v2`) : elle apparaît dans
la même liste de cibles, `display-mode: standalone` le confirme depuis la page.

Quatre choses à injecter, sinon la mesure ne reproduit rien :

1. **un pilote GPS à 1 Hz** — remplacer `navigator.geolocation.watchPosition` dans
   `evaluateOnNewDocument`. `Emulation.setGeolocationOverride` ne suffit pas : il ne pousse pas de
   flux, et le `watchPosition` de l'app finit en `Timeout expired` — ce qui **masque** la panne ;
2. **de la latence réseau** — `Network.emulateNetworkConditions { latency: 1500 }`. Sur le WiFi du
   poste, OSRM répond en ~250 ms et le bug ne sort pas ; c'est la latence mobile qui le révèle ;
3. **le hook `console`** (voir plus bas), seul moyen de lire les logs applicatifs ;
4. **la trace** — ouvrir l'app avec `?trace=1` (ou tourner en DEV) pour que `startTrace()`
   (`packages/shared/src/trace.ts`, appelé par `apps/web/src/main.tsx`) enregistre. Sans ça `window.__trace` n'existe pas et la frise n'a rien à lire.

La cadence des fixes, les aborts tombés en vol et le délai du premier tracé se lisent sur la
frise plutôt qu'à l'œil dans les logs — c'est une classe de bug temporelle. Après le run,
l'onglet **encore ouvert** :

```js
await Bun.write("/tmp/trace.json", JSON.stringify(await tab.evaluate(() => window.__trace)));
```

```bash
bun scripts/frise.ts --in=/tmp/trace.json   # → frise-out/frise.html
```

Un run de bureau sans pilote GPS injecté produit une frise que la page elle-même refuse de
laisser lire comme une preuve : sous cinq fixes, elle affiche un bandeau rouge.

⚠️ **Les scripts `evaluateOnNewDocument` s'accumulent sur une cible et survivent au `reload`.**
Un pilote GPS injecté pour un test précédent continue de répondre à la place du vrai GPS —
observé ici, avec des « fixes réels » qui étaient synthétiques. Pour repasser en GPS réel :
fermer la cible (`/json/close/<id>`), relancer l'app, se rattacher.

## Déploiement

⚠️ **Un push vert ne garantit PAS que la prod a bougé.** Le déploiement FTP échoue par
intermittence — `Error: Timeout (control socket)`, vu les 2026-08-22 et 2026-08-23 — surtout après
plusieurs déploiements rapprochés. `Code Quality` passe, `Deploy` non, et la prod reste
**silencieusement** une version en retard. Remède qui marche : `gh run rerun <id> --failed`.
Toujours **vérifier le bundle servi**, jamais le déduire :

```bash
LIVE=$(curl -s "https://myggvgps.charlesbourgault.com/?cb=$RANDOM" \
       | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js')
curl -s "https://myggvgps.charlesbourgault.com/$LIVE" -o /tmp/prod.js
cmp /tmp/prod.js "apps/web/dist/${LIVE}"
```

`deploy.yml` (push sur `main`) : `bun run build` → FTP vers Hostinger
(`myggvgps.charlesbourgault.com`, LiteSpeed, `public/.htaccess` gère le SPA fallback et les
en-têtes de sécurité). `quality.yml` fait tourner le gate plus un scan Semgrep
(`p/owasp-top-ten`, `p/security-audit`, `p/typescript`, `p/react`) sur chaque push/PR vers `main`.

## Mise à jour de la PWA — `autoUpdate`, et le `skipWaiting` obligatoire

`vite.config.ts` déclare `registerType: "autoUpdate"`, et `src/sw.ts` appelle `self.skipWaiting()`
**au niveau module**, avant `clientsClaim()`. Les deux sont nécessaires, et c'est le piège :
`vite-plugin-pwa` ne force `workbox.skipWaiting` que sur le chemin **`generateSW`**. Ce projet est
en `strategies: "injectManifest"` — il possède son propre `sw.ts` — donc changer `registerType`
seul laisse le nouveau worker en attente **indéfiniment**, et la PWA installée continue de servir
le bundle précaché précédent. Le guide `guide/inject-manifest.md` de l'outil le dit explicitement.

Mesuré le 2026-08-23, avant/après : en `"prompt"`, **deux relances** servaient encore l'ancien
bundle et l'ancien numéro de version, avec un toast demandant un tap. Depuis : **une relance**
suffit, et la montée depuis l'ancien worker prend **deux relances sans aucun geste** (la première
échange le worker en silence, la seconde sert la nouvelle app).

⚠️ **Rien ne doit rétablir un `registration.update()` périodique.** Le navigateur vérifie à chaque
lancement, ce qui est le bon moment pour une marche de quelques minutes — alors qu'une mise à jour
trouvée **en pleine navigation** rechargerait la page et jetterait l'itinéraire actif.

`UpdateToast` ne porte donc plus qu'un seul état, `offlineReady` : `needRefresh` ne peut plus se
déclencher. Ne pas y remettre de bouton « Update ».

## Bibliothèques interdites (vérifié absentes du code)

`react-map-gl`, `@turf/turf`, `react-router-dom`, `Context`/`Redux`/`Zustand` — 100 % MapLibre
natif, état local (`useState`), pas de gestion d'état globale.

**Aucune bibliothèque d'animation** non plus. Les animations d'entrée sont des `@keyframes`
CSS dans `app.css`, et les trois courbes de ressort (`--ggv-spring-modal|slide|pill`) sont les
anciens ressorts framer-motion, ajustés par moindres carrés en `cubic-bezier()` — durées
inchangées, écart mesuré ≤ 5,2 % de la course (détail dans `design-tokens.css`). Il n'y a **pas**
d'animation de sortie : elle exigerait `@starting-style`, qui demande Safari 17.5
(MDN browser-compat-data).

⚠️ Le plancher navigateur de cette app n'est **pas** fixé par `build.target: "esnext"` —
`esnext` est une cible de transpilation (« ne rien abaisser »), pas une matrice de support, et il
n'y a ni `browserslist` ni `build.cssTarget` ici. Ce qui fixe le plancher, c'est le parc :
iPhone X / 8 / 8 Plus sont bloqués sur iOS 16.7 définitivement (iOS 17 abandonne les A11), et ces
téléphones circulent au village. Toute fonctionnalité CSS exigeant Safari 17+ y est donc morte
pour de bon — c'est ce qui condamnait `linear()` (Safari/iOS 17.2).

`@media (prefers-reduced-motion: reduce)` (`app.css`) les neutralise toutes.

## Couleurs — trois rôles, à ne pas confondre

Le vert de marque servait à la fois de **remplissage** et de **texte**, sur des fonds qui passent
du quasi-blanc (`rgba(255,255,255,0.85)`, pilule de verre en clair) au quasi-noir
(`rgba(30,30,30,0.9)`, la même en sombre). Aucune luminosité ne satisfait les deux : à 4,5:1 près,
`--ggv-color-primary` tombait à **2,05:1** sur la pilule claire et **4,31:1** sur la sombre. Les
rôles sont donc séparés, et il faut les garder séparés :

| Token                           | Rôle                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `--ggv-color-primary`           | **remplissage décoratif SEULEMENT** — bordures, dégradés d'icône, ramp de marque |
| `--ggv-color-primary-text`      | tout texte ou icône de couleur marque ; a une valeur par mode                    |
| `--ggv-color-cta` / `-cta-dark` | les deux arrêts du dégradé de CTA                                                |
| `--ggv-color-on-cta`            | texte du CTA — **fixe dans les deux modes**                                      |

⚠️ **Cinq pièges vérifiés.** (1) `color: var(--ggv-color-primary)` ne doit réapparaître nulle
part — c'était la cause de la panne. (2) `--ggv-color-on-cta` ne doit **pas** suivre
`--ggv-color-surface`, qui bascule à `#1a1a1a` en mode sombre : c'est ce qui mettait du texte
sombre à 2,22:1 sur un dégradé vert foncé. (3) Une `opacity` sur du texte de marque le refait
échouer — c'est pour ça que les trois règles tagalog n'en ont plus. (4) **Ne jamais mettre
`.tagalog-inline` dans un bouton** : cette classe force `--ggv-color-primary-text`, soit du vert
sur le dégradé vert du CTA — mesuré **1,24:1** en clair, **1,80:1** en sombre. Dans un bouton, la
glose tagalog est du texte inline qui **hérite** la couleur du bouton. (5) Chercher la règle qui
**gagne** avant de mesurer : l'icône de `.nav-cancel-btn` prend sa couleur de
`.nav-cancel-btn svg` (le `<svg>` trace en `currentColor`), pas du bouton — un `color` posé sur le
bouton y est mort.

Toute nouvelle couleur de texte se calcule contre le **pire fond réel**, pilule de verre
composée sur une carte sombre (`#d9d9d9`) ou claire (`#343434`) comprise, pas contre
`--ggv-color-surface` seul. Valeurs et marges mesurées : commentaire en tête de
`design-tokens.css`.

## Hôtes externes — il n'en reste que deux

Convex (`*.convex.cloud`) et les deux routeurs OSRM publics. Tout le reste est auto-hébergé :
tuiles PMTiles, sprite, police d'interface, et **les étiquettes de carte n'ont plus de source
distante** — le style ne déclare aucun `glyphs`, donc MapLibre les rastérise sur l'appareil
(TinySDF) au lieu d'aller chercher des PBF sur `demotiles.maplibre.org`. Conséquence assumée :
la police des étiquettes est celle du système, pas Noto Sans.

La CSP d'`index.html` est la liste de référence : y ajouter un hôte se justifie dans la même
revue que le code qui l'appelle, et en retirer un se vérifie **sur l'appareil**, pas au grep —
brancher un écouteur `securitypolicyviolation` sur `document` et faire une navigation complète.
`server.arcgisonline.com` en est sorti ainsi : zéro consommateur dans `src/`, `public/`, le JSON
de style et `vite.config.ts`, puis zéro violation mesurée sur A16 avec tuiles, sprite,
étiquettes, Convex et OSRM.

## Langues

- **Communication avec le dev** : français.
- **Contenu de l'app** : anglais **+ traduction tagalog courte** (public : résidents philippins
  de Garden Grove Village), ex. `<h1>Enable Location</h1><p>(I-enable ang Lokasyon)</p>`.
- Les **instructions de navigation** passent par `TURN_LABELS` (`packages/shared/src/routing.ts`), une table
  `{en, tl}` de 8 entrées clée sur le `modifier` OSRM — vocabulaire clos et garanti par l'API
  (le `type`, lui, est ouvert : « new identifiers might be introduced without API change »).
  Toute autre chaîne affichée se met dans `COPY` (`packages/shared/src/copy.ts`), pas en dur dans
  le composant.
- **Libellés de boutons** : la glose va **inline entre parenthèses dans le libellé même**
  (`Navigate (Mag-navigate)`), jamais dans un `<span className="tagalog-inline">` — voir le piège
  (4) de la section _Couleurs_. Couvert partout : Welcome, Arrived (2 boutons), UpdateToast
  (bouton unique `OK (Sige)`), ErrorBoundary, l'écran hors ligne, et les 3 états du bouton GPS.

## Données du village

`VILLAGE_CENTER`, `VILLAGE_EXIT` et `VILLAGE_BOUNDS` (`packages/shared/src/village.ts`) sont des coordonnées codées en
dur, pas lues depuis Convex. `packages/shared/src/blocks.ts` porte 49 points-étiquettes (`blockLabels`,
un centroïde par bloc nommé) qui alimentent la seule couche `block-labels` — aucun contour n'est
dessiné. Les 41 blocs de Convex ont tous leur étiquette ; les 8 autres (`9 10 13 17 35 37 43 47`)
sont des zones numérotées sans lot. La liste des blocs et lots vient, elle, de Convex (voir plus
haut) : deux sources de vérité pour la géométrie village, à garder synchronisées à la main.

Ces étiquettes sont rendues par TinySDF avec la police du système (voir § _Hôtes externes_) :
leur rendu diffère donc légèrement d'un appareil à l'autre, et c'est voulu.
