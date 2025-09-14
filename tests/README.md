# 🧪 Tests MapLibre Optimisations

Ce répertoire contient les tests pour valider les optimisations MapLibre natives implémentées.

## 📁 Structure des Tests

```
tests/
├── unit/                    # Tests unitaires
│   └── test-maplibre-optimizations.js
├── integration/             # Tests d'intégration
│   ├── test-transitions.html
│   └── validate-optimizations.js
└── performance/             # Tests de performance (à créer si besoin)
```

## 🚀 Comment Utiliser les Tests

### 1. Tests Unitaires (Node.js)

**Fichier**: `tests/unit/test-maplibre-optimizations.js`

```bash
# Exécuter les tests unitaires
node tests/unit/test-maplibre-optimizations.js
```

**Ce que ça teste**:
- ✅ `calculateDistance()` avec projections MapLibre
- ✅ `calculateBearing()` avec projections pixel
- ✅ `findClosestPointOnRoute()` optimisé
- ✅ `isUserOffRoute()` avec queryRenderedFeatures
- ✅ `updateUserPositionOnRoute()` avec Feature State API
- ✅ Performance: 10,000+ calculs en < 100ms

### 2. Tests d'Intégration (Navigateur)

**Fichier**: `tests/integration/test-transitions.html`

```bash
# Ouvrir dans le navigateur
open tests/integration/test-transitions.html
# ou visiter: http://localhost:5173/tests/integration/test-transitions.html
```

**Ce que ça teste**:
- ✅ Transitions `flyTo()` sécurisées
- ✅ Transitions GPS optimisées
- ✅ Fallbacks d'urgence
- ✅ Animations concurrentes
- ✅ Gestion des erreurs MapLibre

### 3. Validation en Temps Réel (Console)

**Fichier**: `tests/integration/validate-optimizations.js`

```javascript
// Dans la console du navigateur (F12) sur http://localhost:5173
// Copier-coller le contenu de validate-optimizations.js
```

**Ce que ça teste**:
- ✅ Carte MapLibre chargée correctement
- ✅ Fonctions optimisées disponibles
- ✅ Layers et sources configurés
- ✅ Performance runtime
- ✅ État de navigation

## 📊 Résultats Attendus

### Tests Unitaires
```
✅ calculateDistance: Optimisation MapLibre fonctionnelle
✅ calculateBearing: Optimisation MapLibre fonctionnelle  
✅ findClosestPointOnRoute: Performance améliorée
✅ isUserOffRoute: Détection optimisée avec queryRenderedFeatures
✅ updateUserPositionOnRoute: Feature State API fonctionnelle
📈 Résultat: 5/5 tests réussis
🎉 Toutes les optimisations MapLibre sont fonctionnelles!
```

### Tests d'Intégration
- ✅ Transitions fluides sans erreurs
- ✅ Pas de "Cannot read properties of null"
- ✅ Animations GPS réussies
- ✅ Fallbacks fonctionnels en cas d'erreur

### Validation Runtime
- ✅ Carte chargée: true
- ✅ Fonctions optimisées: 6/6
- ✅ Layers configurés: 3/3
- ✅ Sources créées: 3/3
- ✅ Performance: >1000 calculs/seconde

## 🔧 Dépannage

### Problèmes Courants

1. **"Map not loaded"**
   ```javascript
   // Attendre que la carte soit prête
   map.on('load', () => {
       // Exécuter les tests
   });
   ```

2. **"Function not found"**
   ```javascript
   // Vérifier que les modules sont chargés
   import { calculateDistance } from './src/utils/geoUtils.js';
   ```

3. **Performance lente**
   ```javascript
   // Vérifier le zoom level et les paramètres
   console.log('Zoom:', map.getZoom());
   console.log('Center:', map.getCenter());
   ```

## 📈 Améliorations Futures

- [ ] Tests de performance automatisés avec Lighthouse
- [ ] Tests de charge avec 1000+ marqueurs
- [ ] Tests de compatibilité navigateur
- [ ] Tests de batterie sur mobile
- [ ] Benchmarks A/B avant/après optimisation

## 💡 Astuces

- Utilisez la **console du navigateur** pour des tests rapides
- Les **tests unitaires** sont parfaits pour valider les fonctions
- Les **tests d'intégration** vérifient le comportement global
- La **validation runtime** confirme que tout fonctionne en conditions réelles

---

**🎯 Objectif**: S'assurer que les optimisations MapLibre améliorent réellement les performances sans casser les fonctionnalités existantes.