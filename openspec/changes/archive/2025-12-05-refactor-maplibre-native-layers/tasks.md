# Tasks: Refactor MapLibre Native Layers

## 1. Préparation

- [x] 1.1 Sauvegarder les styles actuels de `RouteLayers.jsx` (couleurs, widths, opacity, dash patterns)
- [x] 1.2 Documenter les layer IDs actuels pour référence

## 2. Refactoring navigation.js

- [x] 2.1 Créer `initNativeRouteLayers(map)` avec tous les layers (shadow, casing, line) pour route et traveled
- [x] 2.2 Implémenter les expressions Feature State dans les paint properties
- [x] 2.3 Créer `updateRouteSource(map, routeGeoJSON)` pour mettre à jour la source principale
- [x] 2.4 Créer `updateTraveledSource(map, traveledGeoJSON)` pour la portion parcourue
- [x] 2.5 Corriger `isUserOffRoute()` pour utiliser les bons layer IDs
- [x] 2.6 Créer `cleanupRouteLayers(map)` pour suppression propre
- [x] 2.7 Supprimer le code mort (ancien système Feature State non connecté)
- [x] 2.8 Supprimer l'import et l'initialisation de `MapLibreGlDirections`

## 3. Adaptation useRouteManager.js

- [x] 3.1 Les fonctions `createRoute()`, `createRemainingRoute()`, `createTraveledRoute()` mettent à jour les sources natives directement
- [x] 3.2 Ajouter `clearRouteSources()` dans `handleNewDestination()`
- [x] 3.3 Garder les states React pour la logique métier (déviation, etc.)
- [x] 3.4 Garder `originalRoute` pour les calculs de déviation

## 4. Adaptation MapLayout.jsx

- [x] 4.1 Supprimer l'import de `RouteLayers`
- [x] 4.2 Supprimer le composant `<RouteLayers />` du JSX
- [x] 4.3 Ajouter `initNativeRouteLayers(map)` dans le `onLoad` handler
- [x] 4.4 Ajouter `cleanupRouteLayers()` dans le cleanup effect
- [x] 4.5 Supprimer `initMapLibreDirections()` du useEffect

## 5. Nettoyage

- [x] 5.1 Supprimer le fichier `src/components/RouteLayers.jsx`
- [x] 5.2 Supprimer `@maplibre/maplibre-gl-directions` de package.json
- [x] 5.3 Exécuter `npm install` pour mettre à jour le lockfile
- [x] 5.4 Supprimer les imports inutilisés dans `navigation.js`

## 6. Adaptation NavigationContext (si nécessaire)

- [x] 6.1 Vérifier si `route` / `traveledRoute` sont utilisés ailleurs dans le contexte
- [x] 6.2 States conservés pour la logique métier dans `NavigatePage.jsx`

## 7. Validation

- [x] 7.1 `npm run lint` - Aucune erreur
- [x] 7.2 `npm run build` - Build réussi
- [ ] 7.3 Test manuel : Route s'affiche correctement au démarrage navigation
- [ ] 7.4 Test manuel : Portion parcourue se met à jour pendant la marche
- [ ] 7.5 Test manuel : Déviation de route détectée et recalculée
- [ ] 7.6 Test manuel : Styles visuels identiques (couleurs, épaisseurs, ombres)
- [ ] 7.7 Test sur Android Chrome
- [ ] 7.8 Test sur iOS Safari
