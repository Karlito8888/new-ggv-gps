# Lighthouse Audit — MyGGV GPS

**Date** : 2026-02-26
**Lighthouse** : v13.0.3 | **Build** : Vite production (`bun run build`)

---

## Scores

| Catégorie | Desktop | Mobile |
|-----------|---------|--------|
| **Performance** | 🟢 97 | 🟠 82 |
| **Accessibility** | 🟢 100 | 🟢 100 |
| **Best Practices** | 🟢 96 | 🟠 92 |
| **SEO** | 🟢 100 | 🟢 100 |

## Core Web Vitals

| Métrique | Desktop | Mobile | Cible |
|----------|---------|--------|-------|
| **FCP** | 531 ms 🟢 | 2,406 ms 🟠 | < 1,800 ms |
| **LCP** | 1,254 ms 🟢 | 4,355 ms 🔴 | < 2,500 ms |
| **TBT** | 0 ms 🟢 | 0 ms 🟢 | < 200 ms |
| **CLS** | 0 🟢 | 0 🟢 | < 0.1 |
| **SI** | 531 ms 🟢 | 2,406 ms 🟠 | < 3,400 ms |

---

## Actions à faire

### 🔴 P0 — Critique (impact LCP mobile)

#### 1. ~~Lazy-load MapLibre~~ — NON APPLICABLE

> **Note** : MapLibre (1 MB) est chargé intentionnellement au démarrage car le GPS permission
> overlay affiche "Please wait, map is loading..." avec un spinner. Le bouton "Enable GPS"
> ne devient actif que quand `isMapReady === true`. Différer le chargement de MapLibre
> **augmenterait** le temps d'attente de l'utilisateur. Ce coût est incompressible pour une
> app de navigation GPS.
>
> Les chunks `supabase` (35 KB) et `vendor` (28 KB) sont déjà lazy-loadés correctement.

#### 2. Convertir le logo GGV de PNG à WebP/AVIF

`ggv-UekKvlqT.png` (13.3 KB) → WebP (~5 KB) ou AVIF (~3 KB).
Lighthouse signale aussi que l'image est servie en basse résolution pour les écrans haute densité.

**Action** :
- Convertir `public/ggv.png` en WebP (avec fallback PNG via `<picture>`)
- Ou mieux : le convertir en SVG si possible (logo vectoriel = 0 pixelisation)
- Ajouter `width` et `height` explicites sur le `<img>` pour éviter les layout shifts

**Fichiers** : `public/ggv.png`, `index.html`
**Gain estimé** : ~8-10 KB

#### 3. CSS render-blocking

Le fichier CSS `index-*.css` (87 KB) bloque le rendu pendant ~150ms.
91% du CSS est inutilisé au premier rendu (seulement le GPS overlay est visible).

**Action** :
- Inliner le CSS critique (GPS overlay + base layout) dans `index.html` via un plugin Vite
- Charger le reste du CSS en async avec `media="print" onload="this.media='all'"`
- Ou utiliser `vite-plugin-critical` pour automatiser

**Fichiers** : `vite.config.ts`, `index.html`
**Gain estimé** : FCP mobile -150ms

### 🟡 P1 — Important

#### 4. Preconnect aux domaines tiers

MapLibre charge des tiles depuis des CDN externes. Les DNS lookups ajoutent de la latence.

**Action** : Ajouter dans `index.html` :
```html
<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin>
<link rel="preconnect" href="https://your-supabase-url.supabase.co" crossorigin>
```

**Fichiers** : `index.html`
**Gain estimé** : ~100-200ms sur le LCP

#### 5. Source maps manquantes pour le debug production

Le chunk `maps-DSxBy45s.js` n'a pas de source map valide en production.

**Action** : Activer les source maps en production dans `vite.config.ts` :
```ts
build: {
  sourcemap: 'hidden', // génère les .map mais ne les expose pas au client
}
```
Uploader les source maps vers un service de monitoring (Sentry, etc.) si nécessaire.

**Fichiers** : `vite.config.ts`

#### 6. Erreur console au chargement

WebGL context creation error détecté par Lighthouse (attendu en headless mais à vérifier sur device réel).

**Action** : Vérifier sur un vrai device Android/iOS que l'erreur n'apparaît pas.
Si elle apparaît, ajouter un fallback gracieux quand WebGL n'est pas disponible.

### 🟢 P2 — Nice to have

#### 7. HTTP/2 Server Push (Hostinger)

Lighthouse recommande HTTP/2 pour le multiplexage des requêtes.

**Action** : Vérifier que Hostinger sert bien en HTTP/2 (LiteSpeed le supporte nativement).
Si ce n'est pas le cas, activer-le dans le panneau Hostinger.

#### 8. Cache policy pour les assets

Les assets statiques doivent avoir des headers `Cache-Control: public, max-age=31536000, immutable`.
Déjà configuré dans `.htaccess` — à vérifier après déploiement sur Hostinger.

#### 9. HSTS (HTTP Strict Transport Security)

Lighthouse recommande HSTS. Déjà préparé mais commenté dans `.htaccess`.

**Action** : Décommenter la ligne HSTS dans `public/.htaccess` après confirmation que le SSL fonctionne :
```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```

---

## Résumé des priorités

| # | Action | Impact | Effort | Catégorie |
|---|--------|--------|--------|-----------|
| ~~1~~ | ~~Lazy-load MapLibre~~ | N/A — intentionnel | — | — |
| 2 | Logo PNG → WebP/SVG | 🔴 LCP -8KB | Faible | Performance |
| 3 | CSS critique inline | 🟠 FCP -150ms | Moyen | Performance |
| 4 | Preconnect tiles/supabase | 🟡 LCP -200ms | Trivial | Performance |
| 5 | Source maps hidden | 🟡 Debug | Trivial | Best Practices |
| 6 | Vérifier erreur WebGL | 🟡 Console | Trivial | Best Practices |
| 7 | Vérifier HTTP/2 | 🟢 Multiplexage | Trivial | Performance |
| 8 | Vérifier cache headers | 🟢 Repeat visits | Trivial | Performance |
| 9 | Activer HSTS | 🟢 Sécurité | Trivial | Security |

**Note** : Le score mobile Performance à 82 est principalement dû au poids incompressible
de MapLibre GL (1 MB). C'est le coût d'une app de navigation GPS côté client.
Les actions 2-4 peuvent améliorer le score de quelques points, mais atteindre 90+ mobile
nécessiterait du SSR ou du code-splitting plus agressif, ce qui n'est pas pertinent pour cette PWA.

