# Intégration Radix UI - Documentation

## Vue d'ensemble

Ce projet a été migré pour utiliser Radix UI comme système de composants principal, avec une architecture CSS centralisée et moderne.

## Changements apportés

### 1. Installation des dépendances

- **Radix UI Components** : Dialog, Alert Dialog, Dropdown Menu, Tooltip, etc.
- **Utilitaires CSS** : `class-variance-authority`, `clsx`, `tailwind-merge`
- **Configuration Tailwind CSS** : Variables CSS personnalisées intégrées

### 2. Structure CSS centralisée

```
src/styles/
├── index.css          # Point d'entrée principal
├── globals.css        # Styles globaux et layout
├── variables.css      # Variables CSS personnalisées
├── components.css     # Styles des composants
└── map-controls.css   # Styles des contrôles de carte
```

### 3. Composants UI réutilisables

```
src/components/ui/
├── button.jsx         # Composant Button avec variants
├── dialog.jsx         # Composant Dialog Radix UI
├── alert-dialog.jsx   # Composant Alert Dialog
└── index.js          # Exports centralisés
```

### 4. Composants migrés

- `WelcomeModal` → `WelcomeModalNew` (utilise Radix UI Dialog)
- `ArrivalModal` → `ArrivalModalNew` (utilise Radix UI Dialog)
- `LocationPermissionModal` → `LocationPermissionModalNew` (utilise Radix UI Dialog)

## Avantages de cette architecture

### 1. Accessibilité
- Radix UI fournit des composants accessibles par défaut
- Support complet des lecteurs d'écran
- Navigation au clavier optimisée

### 2. Maintenabilité
- CSS centralisé et organisé
- Composants réutilisables avec variants
- Variables CSS cohérentes

### 3. Performance
- Composants optimisés et légers
- CSS tree-shaking avec Tailwind CSS
- Chargement conditionnel des modales

### 4. Développement
- API cohérente pour tous les composants
- TypeScript ready (si migration future)
- Meilleure expérience développeur

## Utilisation

### Composants UI de base

```jsx
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "./components/ui/dialog";

// Utilisation du Button avec variants
<Button variant="primary" size="lg">
  Cliquez ici
</Button>

// Utilisation du Dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogTitle>Titre du modal</DialogTitle>
    {/* Contenu */}
  </DialogContent>
</Dialog>
```

### Utilitaire de classes CSS

```jsx
import { cn } from "./lib/utils";

// Combinaison de classes avec gestion des conflits Tailwind
<div className={cn("bg-primary text-white", isActive && "bg-secondary")} />
```

## Variables CSS personnalisées

Les couleurs du projet sont maintenant définies comme variables CSS dans `src/styles/variables.css` :

```css
:root {
  --color-white: #f4f4f4;
  --color-green: #50aa61;
  --color-yellow: #f3c549;
  --color-black: #121212;
  
  /* Variables Radix UI */
  --primary: 142 76% 36%;
  --background: 0 0% 100%;
  /* ... */
}
```

## Migration future

Pour ajouter de nouveaux composants Radix UI :

1. Installer le package : `npm install @radix-ui/react-[component]`
2. Créer le wrapper dans `src/components/ui/`
3. Ajouter les styles dans `src/styles/components.css`
4. Exporter depuis `src/components/ui/index.js`

## Notes importantes

- Les anciens fichiers CSS ont été supprimés
- Tous les styles sont maintenant centralisés
- Les modales utilisent maintenant l'API Radix UI (prop `isOpen` au lieu de rendu conditionnel)
- La configuration Tailwind CSS inclut les variables personnalisées
