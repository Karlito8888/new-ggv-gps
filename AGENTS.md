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
- `anyApi.locations.lotsWithCoordsByBlock` — `src/components/WelcomeOverlay.tsx`, lots + coords
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
filtre de `lotList` (`src/components/WelcomeOverlay.tsx:38-40`), qui renvoie ce cas vers le
chemin « No lots available » existant.

Côté myggv, l'ouverture de ces deux queries est **garantie par un test**, pas seulement par un
commentaire : `convex/authz.test.ts` les liste dans `OPEN` et les appelle sans identité
(`devrait rester publique`), et une vérification d'exhaustivité y interdit qu'une query exportée
échappe au classement. Ajouter `requireIdentity` sur l'une des deux fait donc **rougir la CI de
myggv** avant d'atteindre la production. Le contrat est aussi écrit dans le tableau de gardes en
tête de `convex/locations.ts` et dans les deux `AGENTS.md` de ce dépôt. Rien à ajouter là-bas :
ce qu'il faut, c'est garder les noms synchronisés si l'une des deux queries change de contrat.

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

⚠️ **Trois pièges vérifiés.** (1) `color: var(--ggv-color-primary)` ne doit réapparaître nulle
part — c'était la cause de la panne. (2) `--ggv-color-on-cta` ne doit **pas** suivre
`--ggv-color-surface`, qui bascule à `#1a1a1a` en mode sombre : c'est ce qui mettait du texte
sombre à 2,22:1 sur un dégradé vert foncé. (3) Une `opacity` sur du texte de marque le refait
échouer — c'est pour ça que les trois règles tagalog n'en ont plus.

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
revue que le code qui l'appelle. ⚠️ `server.arcgisonline.com` y figure encore **sans aucun
consommateur** dans le code (vérifié) — dette antérieure, à supprimer quand quelqu'un touchera
la CSP pour une autre raison.

## Langues

- **Communication avec le dev** : français.
- **Contenu de l'app** : anglais **+ traduction tagalog courte** (public : résidents philippins
  de Garden Grove Village), ex. `<h1>Enable Location</h1><p>(I-enable ang Lokasyon)</p>`.
- Les **instructions de navigation** passent par `TURN_LABELS` (`src/lib/routing.ts`), une table
  `{en, tl}` de 8 entrées clée sur le `modifier` OSRM — vocabulaire clos et garanti par l'API
  (le `type`, lui, est ouvert : « new identifiers might be introduced without API change »).
  Toute nouvelle chaîne affichée se met là, pas en dur dans le composant.

## Données du village

`VILLAGE_CENTER` (`useMapSetup.ts`) et `VILLAGE_EXIT` (`App.tsx`) sont des coordonnées codées en
dur, pas lues depuis Convex. `src/data/blocks.ts` porte 62 points-étiquettes (`blockLabels`,
un centroïde par bloc) qui alimentent la seule couche `block-labels` — aucun contour n'est
dessiné. La liste des blocs et lots vient, elle, de Convex (voir plus haut) : deux sources de
vérité pour la géométrie village, à garder synchronisées à la main.

Ces étiquettes sont rendues par TinySDF avec la police du système (voir § _Hôtes externes_) :
leur rendu diffère donc légèrement d'un appareil à l'autre, et c'est voulu.
