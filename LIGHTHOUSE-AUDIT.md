# 🔍 Lighthouse Audit — MyGGV GPS (v4.0.1)

> **Date** : 22 avril 2026
> **Auditeur** : Pi (AI Code Agent)
> **Version auditée** : 4.0.1
> **URL** : https://charlesbourgault.com/myggvgps/

---

## 📊 Scores estimés

> **Note** : Lighthouse CLI ne peut pas mesurer le FCP en mode headless pour cette PWA (MapLibre charge les tuiles PMTiles de manière async + l'overlay GPS permission bloque le premier paint). Les scores ci-dessous sont basés sur l'analyse statique du bundle `dist/`, des headers HTTP, du HTML, du CSS et des bonnes pratiques.

| Catégorie | Score | Justification |
|-----------|-------|---------------|
| **Performance** | 🟢 ~85-95 | Code splitting excellent, lazy loading, React Compiler, Oxc minification, fonts CDN |
| **Accessibility** | 🟡 ~80-90 | `role="dialog"`, `aria-modal`, `aria-label`, `<label>`, `.sr-only`, `reduced-motion` |
| **Best Practices** | 🟢 ~95-100 | CSP sans `unsafe-inline`, HTTPS, pas de console.log app, pas de deprecated APIs |
| **SEO** | 🟢 ~90-100 | `<html lang>`, meta description, OG tags, canonical, robots.txt, sitemap |

---

## 1. 🟢 PERFORMANCE

### 1.1 Bundle Analysis

| Chunk | Taille | % du total | Analyse |
|-------|--------|-----------|---------|
| `maps-*.js` | 1,020 KB | 63% | MapLibre + PMTiles — intrinsèquement lourd, lazy-loadé ✅ |
| `vendor-*.js` | 185 KB | 11% | React DOM — normal |
| `supabase-*.js` | 183 KB | 11% | Lazy-loadé via proxy ✅ |
| `animations-*.js` | 77 KB | 5% | Framer Motion `domAnimation` ✅ |
| `index-*.js` | 58 KB | 4% | Code app — excellent |
| `protomaps-layers-*.js` | 58 KB | 4% | Layers JSON lazy-loadé ✅ |
| `workbox-*.es5.js` | 6 KB | <1% | PWA runtime ✅ |
| `rolldown-runtime-*.js` | 1 KB | <1% | Rolldown runtime ✅ |
| **JS Total** | **1,615 KB** | | |
| `index-*.css` | 88 KB | | Styles — correct |
| **Total `dist/`** | **3.51 MB** | | |

### 1.2 ✅ Points forts

- **Vite 8 + Rolldown + Oxc** : build en ~0.75s (7x plus rapide que Vite 7)
- **Code splitting** : 5 chunks séparés, tous lazy-loadés sauf `vendor`
- **React Compiler** : optimisations automatiques (pas de `useMemo`/`useCallback` manuels)
- **`console.log` supprimés** : zéro dans le code app (Oxc `drop_console`)
- **Fonts CDN** : glyphs MapLibre servis à la demande (102 MB supprimés)
- **PMTiles warm-cache** : SW précharge le fichier tiles (1.4 MB) à l'install
- **5-tier cache SW** : precache → CacheFirst → RangeRequests → StaleWhileRevalidate → NetworkFirst

### 1.3 ⚠️ Points d'attention

- **`maps` chunk = 1 MB** : MapLibre est intrinsèquement lourd. Pas d'alternative plus légère comparable.
- **`supabase` chunk = 183 KB** : lazy-loadé uniquement quand l'utilisateur sélectionne un block/lot. Acceptable.
- **Lighthouse `NO_FCP`** : Le premier paint mesurable est bloqué par l'overlay GPS permission + MapLibre async. C'est inhérent à une PWA GPS.

---

## 2. 🟡 ACCESSIBILITY

### 2.1 ✅ Points forts

| Critère | Status | Détail |
|---------|--------|--------|
| `<html lang="en-PH">` | ✅ | Locale Philippines correcte |
| `role="dialog"` + `aria-modal="true"` | ✅ | Sur les 5 overlays modaux |
| `aria-label` | ✅ | Sur tous les overlays et boutons |
| `<label>` pour `<select>` | ✅ | Block + Lot selects dans WelcomeOverlay |
| `.sr-only` | ✅ | Labels visuellement cachés pour assistive tech |
| `aria-live="polite"` | ✅ | Instructions de navigation |
| Touch targets ≥ 44px | ✅ | `--ggv-touch-target-min: 2.75rem` |
| `prefers-reduced-motion` | ✅ | CSS + Framer Motion `reducedMotion="user"` |
| `color-scheme: light dark` | ✅ | Support dark mode |
| Labels bilingues | ✅ | Anglais + tagalog |

### 2.2 ⚠️ Points d'attention

| Critère | Status | Détail |
|---------|--------|--------|
| Skip navigation link | ❌ | Pas de lien "skip to content" |
| Focus trap dans les modals | 🟡 | `aria-modal` natif géré par les navigateurs modernes |
| Contraste couleurs documenté | ❌ | Pas de test systématique |
| `<main>` landmark | ❌ | Pas de balise `<main>` — la carte est le contenu principal |
| Skip to main content | ❌ | Pas de lien d'évitement |

---

## 3. 🟢 BEST PRACTICES

### 3.1 ✅ Points forts

| Critère | Status | Détail |
|---------|--------|--------|
| HTTPS | ✅ | Hostinger sert en HTTPS |
| CSP sans `unsafe-inline` | ✅ | `script-src 'self' blob:; style-src 'self'` |
| `X-Content-Type-Options: nosniff` | ✅ | Meta tag présent |
| `Referrer-Policy` | ✅ | `strict-origin-when-cross-origin` |
| Pas de `console.log` dans l'app | ✅ | Oxc `drop_console` |
| Pas de deprecated APIs | ✅ | Vite 8 + target `esnext` |
| Pas de source maps en prod | ✅ | `sourcemap: false` |
| Service Worker fonctionnel | ✅ | 5-tier cache + update toast |
| Manifest PWA complet | ✅ | Icons, screenshots, categories |

### 3.2 ⚠️ Points d'attention

| Critère | Status | Détail |
|---------|--------|--------|
| Console.log dans les libs | 🟡 | 4 occurrences (MapLibre: 1, Supabase: 3) — non supprimables |
| Clé API ORS côté client | 🟡 | Acceptable pour routing public, restrictions de domaine recommandées |
| Pas de HSTS header | 🟡 | Non configurable via meta tag (nécessite un header HTTP côté Hostinger) |
| Pas de COOP/COEP headers | 🟡 | Non configurable via meta tag |

---

## 4. 🟢 SEO

### 4.1 ✅ Points forts

| Critère | Status | Détail |
|---------|--------|--------|
| `<html lang="en-PH">` | ✅ | Locale correcte |
| `<title>` | ✅ | `MyGGV\|GPS` |
| `<meta name="description">` | ✅ | Présent |
| `<link rel="canonical">` | ✅ | URL canonique |
| Open Graph tags | ✅ | og:title, og:description, og:image, og:url |
| Twitter Cards | ✅ | twitter:card, twitter:title, etc. |
| `robots.txt` | ✅ | Présent |
| `sitemap.xml` | ✅ | Présent |
| Web App Manifest | ✅ | Complet (icons, screenshots, categories) |
| `<meta name="theme-color">` | ✅ | `#50AA61` |
| `<meta name="viewport">` | ✅ | Responsive |

### 4.2 ⚠️ Points d'attention

| Critère | Status | Détail |
|---------|--------|--------|
| SPA sans SSR | 🟡 | Les crawlers JS modernes (Google) render le JS, mais pas tous les bots |
| Pas de structured data | 🟡 | Pas de JSON-LD — pas critique pour une PWA GPS |
| Pas de `<h1>` visible | 🟡 | Les overlays utilisent des `<h1>` mais la carte n'a pas de heading |

---

## 5. 🟢 PWA

### 5.1 ✅ Service Worker — Excellent

- **5-tier cache strategy** : precache → CacheFirst → CacheFirst+Range → StaleWhileRevalidate → NetworkFirst
- **Warm-cache** : PMTiles (1.4 MB) préchargé à l'install
- **RangeRequestsPlugin** : support des requêtes partielles PMTiles
- **Update mechanism** : Toast `UpdateToast` via `SKIP_WAITING`
- **skipWaiting() + clientsClaim()** : activation immédiate

### 5.2 ✅ Web App Manifest

- Complet : name, short_name, icons (192x192, 512x512), screenshots, categories
- `display: standalone` — expérience immersive
- `theme_color` + `background_color` cohérents

### 5.3 ⚠️ Points d'attention

| Critère | Status | Détail |
|---------|--------|--------|
| Manifest statique | 🟡 | `manifest: false` dans VitePWA — mis à jour manuellement |
| Pas de push notifications | ✅ | Pas nécessaire pour une app GPS |
| Pas de background sync | ✅ | Le routing fonctionne en direct si offline = carte statique |

---

## 6. 📊 RÉSUMÉ DES MÉTRIQUES

| Métrique | Valeur | Cible | Status |
|----------|--------|-------|--------|
| Taille totale `dist/` | 3.51 MB | < 5 MB | ✅ |
| JS total (unminified) | 1,615 KB | < 500 KB idéal | 🟡 MapLibre lourd |
| JS `index` chunk | 58 KB | < 100 KB | ✅ |
| CSS total | 88 KB | < 100 KB | ✅ |
| Chunks JS | 9 | Minimiser | ✅ |
| `console.log` (app code) | 0 | 0 | ✅ |
| Source maps en prod | 0 | 0 | ✅ |
| Dépendances runtime | 7 | < 10 | ✅ |
| TypeScript strict | ✅ | ✅ | ✅ |
| Tests unitaires | 39 | > 80% coverage | 🟡 |
| CSP `unsafe-inline` | ❌ Retiré | ✅ | ✅ |
| Dark mode | ✅ | ✅ | ✅ |
| `prefers-reduced-motion` | ✅ CSS + FM | ✅ | ✅ |

---

## 7. 🎯 PLAN D'ACTION — Prochaines améliorations

### 🟡 Important

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Ajouter `<main>` landmark autour de la carte | 5 min | Accessibilité |
| 2 | Ajouter un skip navigation link | 30 min | Accessibilité |
| 3 | Ajouter HSTS header côté Hostinger (`.htaccess`) | 15 min | Sécurité |
| 4 | Ajouter COOP/COEP headers (`.htaccess`) | 15 min | Best practice |

### 🟢 Backlog

| # | Action | Effort |
|---|--------|--------|
| 5 | Test de contraste couleurs systématique | 1h |
| 6 | Ajouter structured data (JSON-LD) | 30 min |
| 7 | Supprimer les 4 `console.log` des libs via patch | 1h |

---

_Audit généré le 22 avril 2026 — Basé sur l'analyse statique du bundle `dist/` v4.0.1_
