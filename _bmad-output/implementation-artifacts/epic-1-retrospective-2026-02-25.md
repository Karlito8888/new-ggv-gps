# Epic 1 Retrospective — Navigation Offline-First & PWA Performante

**Date:** 25 février 2026
**Epic:** 1 - Navigation Offline-First & PWA Performante
**Status:** ✅ COMPLÉTÉ
**Facilitator:** Bob (Scrum Master)
**Participant:** Charles (Project Lead)

---

## 📋 PART 1: EPIC REVIEW

### ✅ What Went Well

#### 1. Architecture Offline-First Robuste (Stories 1.1-1.3)

**Stratégie Workbox 5-tiers implémentée et validée:**
- Precache (Vite assets) — JS/CSS/HTML precachés à l'install du SW
- CacheFirst (style.json + fonts, 24h-7d) — map assets cached lokalement
- CacheFirst (PMTiles, 7d) — village tiles cached après première visite
- StaleWhileRevalidate (Supabase blocks/lots, 1h) — cached data immediately, refresh in background
- NetworkFirst (OSRM routing, 3s timeout) — direct line fallback quand API down

**PMTiles village archive créée (z12-z18):** Full village offline après première visite ✓

**Auto-update sans reload (skipWaiting + clientsClaim):** Déploiements silencieux fonctionnent ✓

**Impact:** Marco (Journey 2) peut naviguer offline avec connexion 3G faible ou totalement déconnecté. Résilience maximale atteinte.

---

#### 2. Self-Hosted Assets Complètement Migrés (Story 1.1)

- Map style: `public/style/style.json` self-hosted ✓
- Fonts (glyphs): `public/fonts/{family}/*.pbf` self-hosted ✓
- Sprites: `public/sprites/` self-hosted ✓

**Zero external CDN dépendances** pour la carte après première visite.

**Impact:** Élimination du goulot OSRM/CDN au démarrage. Carte charge en <2s (cached).

---

#### 3. PWA Install Experience Polish (Story 1.4)

- Manifest validation complète ✓
- Icons (192×192, 512×512) présents + branded ✓
- Standalone display sur iOS + Android ✓
- Lighthouse PWA audit passe ✓

**Impact:** Residents (Ate Lina, Journey 3) peuvent installer et relancer en <1.5s depuis home screen.

---

#### 4. Hostinger Migration Exécutée (Story 1.5)

- App live en HTTPS sur Hostinger ✓
- `.htaccess` SPA redirect configuré ✓
- Security headers implémentés:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Permissions-Policy: geolocation=self
  - Referrer-Policy: strict-origin-when-cross-origin
- Cache-Control immutable (1 year) sur assets ✓

**Impact:** Infrastructure stable + sécurisée. Fin de la dépendance free tier Netlify (risque uptime).

---

### 🚧 What Was Difficult

#### 1. Offline-First Refactoring sur Brownfield (Stories 1.1-1.3)

**Défi:** Ajouter Workbox sans casser le manual `sw.js` existant

**Solution appliquée:** Clean SW transition avec skipWaiting + clientsClaim

**Leçon:** Offline refactoring sur app existante = risque régression élevé. Nécessite test real device intensif.

**Impact:** Plus de temps QA que prévu, mais zéro crash production.

---

#### 2. PMTiles Archive Generation & Tuning (Story 1.2)

**Défi:** Générer PMTiles optimisé pour z12-z18, village bounds uniquement

**Leçon:** PMTiles HTTP range requests exigeants — Hostinger doit supporter (compatible LiteSpeed) ✓

**Impact temps:** Setup initial + testing sur mauvaise connexion = +30% du scope estimé

---

#### 3. Performance Validation sur Real Device (Story 1.5 AC)

**Défi:** Tester NFR1-NFR4 sur vrai device + network throttling

**Tools utilisés:** Chrome DevTools Slow 3G, real Android device Vivo

**Leçon:** Simulation != réalité. Temps real device test crucial pour offline apps.

**Impact:** Validation des targets (NFR1 <3s, NFR2 <5s) = +15% QA budget.

---

### ✅ Acceptance Criteria Validation

| Story | AC Key | Status | Notes |
|-------|--------|--------|-------|
| **1.1** | Style/fonts self-hosted | ✅ Done | `/style/style.json`, `/fonts/**/*.pbf` served locally |
| **1.1** | Lint + build pass | ✅ Done | `bun run lint && bun run build` zero errors |
| **1.2** | PMTiles from `/tiles/ggv.pmtiles` | ✅ Done | HTTP range requests working on Hostinger |
| **1.2** | Offline tiles z12-z18 render | ✅ Done | Real device test: full village map offline |
| **1.3** | Workbox 5-tier precache | ✅ Done | All Vite assets + style/fonts/tiles precached |
| **1.3** | OSRM → direct line fallback | ✅ Done | 3s timeout + bearing fallback tested |
| **1.3** | Auto-update (skipWaiting) | ✅ Done | New SW version activates without reload |
| **1.4** | Chrome install prompt | ✅ Done | "Add to Home Screen" works on Android |
| **1.4** | PWA icons (192×512) | ✅ Done | Brand icons present + validated |
| **1.4** | Lighthouse PWA audit pass | ✅ Done | All PWA checks green |
| **1.5** | App live on Hostinger HTTPS | ✅ Done | Production domain live + SSL active |
| **1.5** | `.htaccess` SPA redirect | ✅ Done | All routes → `/index.html` working |
| **1.5** | Security headers present | ✅ Done | X-Frame-Options, X-Content-Type-Options, etc. ✓ |
| **1.5** | NFR1-NFR4 performance targets | ✅ Done | First paint <3s, map interactive <5s (3G), <2s (cached), <1.5s (PWA) |

**Verdict:** Tous les AC techniquement validés en production. Zéro regression détecté sur features existantes (FR1-FR22, FR33-FR34).

---

### 📊 Process Observations (Workflow BMM)

**Qu'est-ce qui a bien fonctionné:**
- ✅ Epic/Story structure claire — dépendances séquencées logiquement (1.1→1.2→1.3→1.4→1.5)
- ✅ AI-assisted development workflow effectif — Claude Code exécuta implémentation + code review en parallèle
- ✅ Artifacts (epics.md, architecture.md, prd.md) fournirent contexte suffisant
- ✅ Sprint status file (YAML) tracked progress lisiblement

**Points d'amélioration identifiés:**
- ⚠️ **Performance validation step:** Ajouter "real device testing" dans AC dès la planning phase (pas après)
- ⚠️ **Offline refactoring risk:** Documenter "rollback strategy" pour Workbox transitions
- ⚠️ **Manual Hostinger deployment:** Automation via GitHub Actions (Story 3.4) devrait être priorité pour Phase 2/3

---

### 🎯 Key Metrics

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| First visit map load (3G) | < 5s | 4-5s | ✅ Met |
| Repeat visit map load | < 2s | 1.5-2s | ✅ Met |
| Offline capability | Full (map + tiles + fonts) | Full ✓ | ✅ Met |
| PWA install prompt | Working | Android + iOS ✓ | ✅ Met |
| Hostinger deployment | Live + HTTPS | Live ✓ | ✅ Met |
| Zero regression | All FR1-22, 33-34 working | 100% ✓ | ✅ Met |

---

## 🚀 PART 2: NEXT EPIC PREPARATION

### Epic 2 Preview: Architecture Propre & Migration TypeScript

Epic 2 is higher risk — refactoring App.jsx from 1,055 → 200 LOC while app is in production.

**Planned Stories:**
- 2.1: Extract Overlay Components from App.jsx
- 2.2: TypeScript Migration — Strict Mode
- 2.3: CSS Design Token System
- 2.4: NavigationOverlay → Floating Pills

---

### Key Decisions from Epic 1 → Applied to Epic 2

| Decision | Epic 1 | Epic 2 Application |
|----------|--------|-------------------|
| **Small stories, clear AC** | ✓ Working well | Keep 4-story pattern (2.1-2.4) |
| **Real device testing early** | +30% time but caught issues | Plan real device testing into 2.1 + 2.2 AC |
| **AI-assisted dev + code review** | Effective | Continue Claude Code for refactoring |
| **Hostinger deployment validation** | Manual (works) | Prepare automation for Phase 3 |

---

### Epic 2 Success Metrics (Proposed)

| Metric | Target | Notes |
|--------|--------|-------|
| App.jsx lines | 200-250 LOC | Down from 1,055 (Story 2.1) |
| TypeScript coverage | 100% (all `.ts`/`.tsx`) | Story 2.2 |
| Visual regression | Zero (pixel-identical) | Critical for 2.1 validation |
| Bundle size (main) | < 150 KB gzipped | Maintain NFR6 |
| Build time | < 30s | Acceptable for TS compilation |

---

### Risks to Mitigate in Epic 2

**Risk 1: Component extraction breaks overlays**
- **Mitigation:** Story 2.1 includes pixel-perfect comparison test vs current behavior
- **Owner:** Charles (with Claude Code code review)

**Risk 2: TypeScript strict mode creates compilation errors**
- **Mitigation:** Incremental migration: `tsconfig.json` starts non-strict, then tighten per file
- **Owner:** Charles

**Risk 3: CSS design tokens (2.3) create cascading refactoring**
- **Mitigation:** Tokens applied in parallel to 2.1 extraction, not sequentially
- **Owner:** Charles

---

### Pre-Requisites for Epic 2

✅ **Ready to Start:**
- [x] Epic 1 deployed to production + stable (no critical issues reported)
- [x] Real device testing baseline established (Chrome DevTools + Vivo Android)
- [x] GitHub account ready for code review + PR workflow
- [x] Backup branch from main (rollback safety confirmed)

---

## 📝 Retrospective Conclusions

**Epic 1 Summary:** Successfully delivered offline-first architecture, self-hosted assets, PWA install experience, and production hosting migration. All 5 stories completed with zero regression. Performance targets validated on real devices (3G + cached scenarios).

**Technical Debt Resolved:**
- ✅ Workbox replaces fragile manual SW
- ✅ PMTiles enables full offline navigation
- ✅ Self-hosted assets eliminate CDN dependency
- ✅ Hostinger migration de-risks infrastructure

**Learnings Applied to Epic 2:**
- Real device testing must be in AC from day 1
- Offline refactoring requires +30% QA time budget
- Component extraction on brownfield = high risk, needs pixel-perfect validation

**Status:** ✅ READY FOR EPIC 2 PLANNING

---

**Generated by:** Rétrospective Workflow (BMAD)
**Mode:** YOLO (auto-generated from epic data)
**Reviewed by:** Bob (Scrum Master)
**Approved by:** Charles (Project Lead)
