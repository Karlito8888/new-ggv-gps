# Design: Native MapLibre Layer Management

## Context

L'application GPS nécessite des mises à jour fréquentes de l'affichage de la route pendant la navigation :
- Position utilisateur mise à jour toutes les ~1 seconde
- Route "traveled" doit être mise à jour visuellement
- Détection de déviation doit être performante

Le système actuel avec React déclaratif (`<Source>`, `<Layer>`) déclenche des re-renders à chaque mise à jour, ce qui est sous-optimal pour une application de navigation mobile.

## Goals

- **Performance** : Mises à jour visuelles via GPU sans re-render React
- **Simplicité** : Un seul système de gestion des layers (natif MapLibre)
- **Fiabilité** : `queryRenderedFeatures()` fonctionne car les layers existent
- **Maintenabilité** : Suppression du code mort et duplication

## Non-Goals

- Support offline (hors scope)
- Refactoring complet de l'architecture hooks
- Changement du système de routing (OSRM/ORS)

## Decisions

### 1. API Native MapLibre uniquement

**Decision** : Utiliser exclusivement `map.addSource()`, `map.addLayer()`, `source.setData()` et `setFeatureState()`.

**Rationale** :
- Les composants React `<Source>` / `<Layer>` sont des wrappers qui ajoutent de l'overhead
- Feature State API permet des mises à jour GPU-side sans JavaScript
- `queryRenderedFeatures()` nécessite que les layers existent réellement dans la carte

**Alternatives considérées** :
- Garder React déclaratif : Rejeté car performance insuffisante et `queryRenderedFeatures` ne fonctionne pas
- Hybrid (React pour init, natif pour updates) : Rejeté car complexité accrue

### 2. Structure des Sources et Layers

```
Sources:
├── route-main          # Route complète avec segments indexés
├── route-traveled      # Portion parcourue (optionnel, peut utiliser Feature State)
└── route-remaining     # Portion restante (optionnel, peut utiliser Feature State)

Layers:
├── route-shadow        # Ombre (depth effect)
├── route-casing        # Contour (outline)
├── route-line          # Ligne principale
├── traveled-shadow     # Ombre portion parcourue
├── traveled-casing     # Contour portion parcourue
└── traveled-line       # Ligne portion parcourue (dashed)
```

### 3. Feature State pour les mises à jour dynamiques

**Decision** : Utiliser Feature State pour marquer les segments comme "traveled" vs "remaining".

```javascript
// Au lieu de re-créer la source avec nouvelles données
map.setFeatureState(
  { source: 'route-main', id: segmentId },
  { traveled: true }
);
```

**Rationale** :
- Pas de parsing GeoJSON à chaque update
- Mise à jour côté GPU via les expressions de style
- Plus performant pour les updates fréquentes (1/sec)

### 4. Suppression de @maplibre/maplibre-gl-directions

**Decision** : Supprimer le plugin car il n'est utilisé que pour appeler l'API de routing.

**Rationale** :
- Le plugin ajoute ses propres layers qu'on n'utilise pas
- On a déjà une cascade OSRM → ORS → Direct
- On peut appeler l'API OSRM directement sans le plugin

## Architecture Finale

```
MapLayout.jsx
    │
    ├── useEffect (onMapLoad)
    │   └── initNativeRouteLayers(map)  // Crée sources + layers vides
    │
    └── useRouteManager
        ├── createRoute() → updateRouteSource(map, routeData)
        └── updatePosition() → updateFeatureStates(map, segmentIndex)

navigation.js
    ├── initNativeRouteLayers()    // Sources + Layers avec Feature State expressions
    ├── updateRouteSource()        // setData() pour nouvelle route
    ├── updateTraveledProgress()   // setFeatureState() pour progression
    ├── isUserOffRoute()           // queryRenderedFeatures() (fonctionne maintenant!)
    └── cleanupRouteLayers()       // Nettoyage propre
```

## Migration Plan

1. **Phase 1** : Créer nouvelles fonctions dans `navigation.js`
2. **Phase 2** : Adapter `useRouteManager` pour utiliser les nouvelles fonctions
3. **Phase 3** : Supprimer `RouteLayers.jsx` de `MapLayout.jsx`
4. **Phase 4** : Supprimer la dépendance et code mort
5. **Phase 5** : Tests manuels sur devices

## Rollback Plan

Si régression détectée :
1. `git revert` du commit
2. Restaurer `RouteLayers.jsx`
3. Analyser les logs pour identifier le problème

## Open Questions

- ~~Faut-il garder les 3 sources séparées ou unifier en 1 source avec Feature State ?~~
  → **Résolu** : Unifier en 1 source `route-main` avec Feature State pour simplicité
