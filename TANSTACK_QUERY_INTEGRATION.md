# Intégration TanStack Query - Documentation

## Vue d'ensemble

Le projet a été amélioré avec TanStack Query (anciennement React Query) pour optimiser la gestion des données et des requêtes vers Supabase. Cette intégration apporte une gestion intelligente du cache, des états de chargement, et des requêtes dépendantes.

## Fonctionnalités ajoutées

### 1. Récupération optimisée des blocs
- **Cache intelligent** : Les blocs sont mis en cache pendant 10 minutes
- **Filtrage automatique** : Exclusion des locations supprimées et verrouillées
- **Tri automatique** : Blocs triés par ordre numérique

### 2. Récupération dynamique des lots
- **Requêtes conditionnelles** : Les lots ne sont récupérés que quand un bloc est sélectionné
- **Cache par bloc** : Chaque bloc a son propre cache de lots
- **Mise à jour automatique** : Quand le bloc change, les lots se mettent à jour

### 3. Validation de location en temps réel
- **Vérification instantanée** : Validation bloc + lot avant soumission
- **Gestion d'erreurs** : Messages d'erreur spécifiques et clairs
- **Données complètes** : Récupération de toutes les informations de la location

## Structure des fichiers

```
src/
├── lib/
│   └── queryClient.js          # Configuration TanStack Query
├── hooks/
│   ├── useLocations.js         # Hooks optimisés pour les locations
│   └── useAvailableBlocks.js   # Ancien hook (peut être supprimé)
└── components/
    ├── WelcomeModalOptimized.jsx    # Modal avec sélection dynamique
    └── LocationDebugPanel.jsx       # Panel de debug (dev only)
```

## Hooks disponibles

### `useAvailableBlocks()`
```jsx
const { data: blocks, isLoading, error } = useAvailableBlocks();
```
- Récupère tous les numéros de blocs disponibles
- Cache : 10 minutes
- Filtre automatiquement les locations supprimées/verrouillées

### `useAvailableLots(blockNumber)`
```jsx
const { data: lots, isLoading, error } = useAvailableLots(blockNumber);
```
- Récupère les lots disponibles pour un bloc donné
- Cache : 5 minutes par bloc
- Requête conditionnelle (ne s'exécute que si blockNumber est défini)

### `useLocation(blockNumber, lotNumber)`
```jsx
const { data: location, isLoading, error, refetch } = useLocation(blockNumber, lotNumber);
```
- Récupère une location spécifique
- Cache : 2 minutes
- Validation automatique des coordonnées
- Formatage des données pour l'application

### `useLocationStats()`
```jsx
const { data: stats, isLoading } = useLocationStats();
```
- Statistiques globales sur les locations
- Cache : 15 minutes
- Utile pour le monitoring et le debug

## Clés de cache

Le système utilise des clés hiérarchiques pour une gestion optimale du cache :

```javascript
locationKeys = {
  all: ['locations'],
  blocks: ['locations', 'blocks'],
  lots: (blockNumber) => ['locations', 'lots', blockNumber],
  location: (blockNumber, lotNumber) => ['locations', 'location', blockNumber, lotNumber],
}
```

## Avantages de cette approche

### 1. Performance
- **Cache intelligent** : Évite les requêtes redondantes
- **Requêtes conditionnelles** : Ne charge que les données nécessaires
- **Background refetch** : Mise à jour silencieuse des données

### 2. Expérience utilisateur
- **Chargement instantané** : Données servies depuis le cache
- **Feedback visuel** : États de chargement granulaires
- **Sélection dynamique** : Lots mis à jour automatiquement

### 3. Robustesse
- **Gestion d'erreurs** : Retry automatique et messages d'erreur clairs
- **Validation** : Vérification des données avant utilisation
- **Fallback** : Valeurs par défaut pour éviter les crashes

## Configuration du cache

```javascript
// Configuration dans queryClient.js
{
  staleTime: 5 * 60 * 1000,     // 5 minutes - données considérées fraîches
  gcTime: 10 * 60 * 1000,       // 10 minutes - durée en mémoire
  retry: 2,                      // 2 tentatives en cas d'erreur
  refetchOnWindowFocus: false,   // Pas de refetch au focus
}
```

## Utilisation dans les composants

### Exemple : WelcomeModalOptimized
```jsx
// Récupération des lots selon le bloc sélectionné
const { data: availableLots = [], isLoading: isLotsLoading } = useAvailableLots(blockNumber);

// Validation de la location avant soumission
const { data: locationData, refetch } = useLocation(blockNumber, lotNumber);

// Soumission optimisée
const handleSubmit = async (e) => {
  e.preventDefault();
  const result = await refetch(); // Force refresh
  if (result.data) {
    onDestinationSelected(result.data);
  }
};
```

## Debug et développement

### Panel de debug
- Visible uniquement en développement
- Affiche les statistiques en temps réel
- Permet de tester les requêtes manuellement
- Visualise l'état du cache

### DevTools TanStack Query
- Interface graphique pour explorer le cache
- Monitoring des requêtes en temps réel
- Debug des états de chargement et erreurs

## Migration depuis l'ancien système

### Avant (useAvailableBlocks)
```jsx
const { availableBlocks, isLoading, error, refetch } = useAvailableBlocks();
```

### Après (TanStack Query)
```jsx
const { data: availableBlocks = [], isLoading, error } = useAvailableBlocks();
```

## Prochaines améliorations possibles

1. **Mutations** : Ajouter/modifier/supprimer des locations
2. **Optimistic updates** : Mise à jour optimiste de l'UI
3. **Infinite queries** : Pagination pour de gros datasets
4. **Real-time** : Synchronisation en temps réel avec Supabase
5. **Offline support** : Cache persistant pour usage hors ligne

## Base de données optimisée

La structure Supabase est optimisée avec des index pour les requêtes TanStack Query :

```sql
-- Index pour les requêtes de blocs
CREATE INDEX idx_locations_block_lot ON locations (block, lot);

-- Index pour les locations actives
CREATE INDEX idx_locations_active ON locations (created_at) 
WHERE deleted_at IS NULL;

-- Index pour les locations déverrouillées
CREATE INDEX idx_locations_unlocked ON locations (id) 
WHERE (is_locked = false OR is_locked IS NULL);
```

Cette intégration transforme votre application en une solution moderne, performante et robuste pour la gestion des données de géolocalisation ! 🚀
