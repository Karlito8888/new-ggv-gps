# Change: Refactor Route Layers to Native MapLibre Imperative API

## Why

L'application utilise actuellement **deux systèmes parallèles** pour gérer les layers de route :

1. **Système React déclaratif** (`RouteLayers.jsx`) - Actif, utilise `<Source>` / `<Layer>` de react-map-gl
2. **Système MapLibre natif** (`navigation.js`) - Initialisé mais **jamais connecté** aux layers React

Cette duplication cause plusieurs problèmes :
- `queryRenderedFeatures()` dans `isUserOffRoute()` cherche des layers inexistants (`route-remaining-layer`, `route-segments-layer`) → **fallback systématique à Turf.js**
- Feature State API préparé mais inutilisé → **re-renders React inutiles** au lieu de mises à jour GPU natives
- Code mort dans `navigation.js` (150+ lignes) → confusion et maintenance difficile
- Plugin `@maplibre/maplibre-gl-directions` initialisé mais utilisé uniquement pour le routing API, pas pour l'affichage

## What Changes

### Suppression
- **BREAKING** : Suppression de `RouteLayers.jsx` (composant React déclaratif)
- Suppression du code Feature State inutilisé dans `navigation.js`
- Suppression de la dépendance `@maplibre/maplibre-gl-directions` (on garde OSRM/ORS pour le routing)

### Unification sur API Native MapLibre
- Les routes sont gérées exclusivement via `map.addSource()` / `map.addLayer()` / `source.setData()`
- Utilisation de `setFeatureState()` pour les mises à jour visuelles (traveled/remaining) sans re-render
- `queryRenderedFeatures()` fonctionne car les layers existent réellement

### Optimisations
- Suppression des re-renders React lors des mises à jour de position
- Updates visuels via GPU (Feature State) au lieu de React state
- `isUserOffRoute()` utilise les layers natifs → pas de fallback Turf.js

## Impact

- **Specs affectées** : `navigation-routing`
- **Fichiers modifiés** :
  - `src/lib/navigation.js` - Nettoyage + unification
  - `src/layouts/MapLayout.jsx` - Suppression `<RouteLayers />`
  - `src/components/RouteLayers.jsx` - **Supprimé**
  - `src/hooks/useRouteManager.js` - Adaptation pour API native
  - `package.json` - Suppression dépendance directions

## Risques et Mitigations

| Risque | Mitigation |
|--------|------------|
| Régression visuelle des routes | Tests manuels sur Android/iOS avant merge |
| Perte de styles avancés (shadow, casing) | Recréer les layers équivalents en natif |
| Breaking change pour les tests | Pas de tests automatisés existants |
