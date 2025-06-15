# Navigation Library - Refactored Structure

Le module de navigation a été refactorisé en plusieurs fichiers spécialisés pour améliorer la lisibilité, la maintenabilité et la réutilisabilité du code.

## Structure des Modules

### 📁 [`constants.js`](./constants.js)
**Constantes et configuration**
- `VILLAGE_EXIT_COORDS` - Coordonnées de sortie du village
- `ARRIVAL_THRESHOLD` - Seuil d'arrivée (10m)
- `ROUTE_DEVIATION_THRESHOLD` - Seuil de déviation de route (30m)
- `MIN_RECALCULATION_INTERVAL` - Intervalle minimum de recalcul (15s)
- `ROUTING_CONFIG` - Configuration des services de routage

### 📁 [`geometry.js`](./geometry.js)
**Calculs géométriques et utilitaires**
- `calculateDistance()` - Distance haversine entre deux points
- `pointToLineDistance()` - Distance d'un point à un segment de ligne
- `calculateBearing()` - Calcul de l'angle de direction
- `bearingToDirection()` - Conversion angle → direction cardinale
- `formatDistance()` - Formatage des distances pour l'affichage

### 📁 [`routeAnalysis.js`](./routeAnalysis.js)
**Analyse de route et suivi de position**
- `isUserOffRoute()` - Détection de déviation de route
- `shouldRecalculateRoute()` - Logique de recalcul de route
- `updateRecalculationState()` - Mise à jour de l'état de recalcul
- `resetRecalculationState()` - Réinitialisation de l'état
- `findClosestPointOnRoute()` - Point le plus proche sur la route

### 📁 [`routeServices.js`](./routeServices.js)
**Services de création de routes et intégrations API**
- `createDirectRoute()` - Route directe de fallback
- `createRoute()` - Création de route avec fallback en cascade
- Intégrations : OSRM, OpenRouteService
- Gestion des timeouts et erreurs

### 📁 [`routeManagement.js`](./routeManagement.js)
**Gestion des segments de route et progression**
- `createRemainingRoute()` - Route restante depuis la position utilisateur
- `shouldUpdateRemainingRoute()` - Logique de mise à jour de route
- `createTraveledRoute()` - Portion de route déjà parcourue
- Calculs de progression et distances

### 📁 [`navigationInstructions.js`](./navigationInstructions.js)
**Instructions de navigation et détection d'arrivée**
- `hasArrived()` - Détection d'arrivée à destination
- `getNavigationInstructions()` - Génération d'instructions de navigation
- Calculs de directions relatives et instructions textuelles

### 📁 [`mapLibreIntegration.js`](./mapLibreIntegration.js)
**Intégration MapLibre GL JS**
- `initMapLibreDirections()` - Initialisation des directions MapLibre
- `cleanupDirections()` - Nettoyage des instances
- `getDirections()` - Accès à l'instance courante

### 📁 [`navigation.js`](./navigation.js) - **Point d'entrée principal**
**Module principal avec réexports**
- Réexporte toutes les fonctions des modules spécialisés
- Maintient la compatibilité avec l'API existante
- Export par défaut pour la rétrocompatibilité

## Utilisation

### Import Spécialisé (Recommandé)
```javascript
// Import seulement ce dont vous avez besoin
import { calculateDistance, formatDistance } from './lib/geometry.js';
import { createRoute } from './lib/routeServices.js';
import { hasArrived } from './lib/navigationInstructions.js';
```

### Import Global (Rétrocompatibilité)
```javascript
// Import du module principal (comme avant)
import { 
  calculateDistance, 
  createRoute, 
  hasArrived 
} from './lib/navigation.js';

// Ou import par défaut
import navigation from './lib/navigation.js';
const distance = navigation.calculateDistance(lat1, lon1, lat2, lon2);
```

## Avantages de la Refactorisation

### ✅ **Lisibilité Améliorée**
- Chaque fichier a une responsabilité claire
- Code plus facile à comprendre et maintenir
- Documentation intégrée avec JSDoc

### ✅ **Maintenabilité**
- Modifications isolées dans des modules spécifiques
- Tests unitaires plus faciles à écrire
- Debugging simplifié

### ✅ **Réutilisabilité**
- Modules indépendants réutilisables
- Tree-shaking optimisé (imports sélectifs)
- API modulaire flexible

### ✅ **Performance**
- Chargement sélectif des fonctionnalités
- Réduction de la taille du bundle
- Optimisations de build améliorées

### ✅ **Rétrocompatibilité**
- Aucun changement requis dans le code existant
- Migration progressive possible
- API stable maintenue

## Migration Progressive

1. **Phase 1** : Utiliser les imports spécialisés dans les nouveaux composants
2. **Phase 2** : Migrer progressivement les composants existants
3. **Phase 3** : Optimiser les imports pour le tree-shaking

## Tests

Chaque module peut maintenant être testé indépendamment :

```javascript
// Test d'un module spécifique
import { calculateDistance } from '../lib/geometry.js';

test('calculateDistance should return correct distance', () => {
  const distance = calculateDistance(0, 0, 1, 1);
  expect(distance).toBeCloseTo(157249, 0); // ~157km
});
```

Cette structure modulaire facilite grandement le développement, les tests et la maintenance du système de navigation MyGGV-GPS.