# Intégration Radix UI Select - Documentation

## Vue d'ensemble

Le WelcomeModal a été amélioré avec les composants Select de Radix UI, remplaçant les éléments `<select>` HTML natifs par une solution moderne, accessible et personnalisable.

## Changements apportés

### 1. Installation du composant Select
```bash
npm install @radix-ui/react-select
```

### 2. Création du composant Select réutilisable
**Fichier :** `src/components/ui/select.jsx`

Composants créés :
- `Select` - Conteneur principal
- `SelectTrigger` - Bouton déclencheur avec icône
- `SelectContent` - Contenu déroulant avec animations
- `SelectItem` - Éléments sélectionnables avec indicateur
- `SelectValue` - Affichage de la valeur sélectionnée
- `SelectGroup`, `SelectLabel`, `SelectSeparator` - Composants d'organisation

### 3. Intégration dans WelcomeModalOptimized

#### Avant (HTML natif)
```jsx
<select
  value={blockNumber}
  onChange={(e) => setBlockNumber(e.target.value)}
  className="form-input"
>
  <option value="">Select a block</option>
  {availableBlocks.map((block) => (
    <option key={block} value={block}>Block {block}</option>
  ))}
</select>
```

#### Après (Radix UI)
```jsx
<Select value={blockNumber} onValueChange={setBlockNumber}>
  <SelectTrigger className="form-input">
    <SelectValue placeholder="Select a block" />
  </SelectTrigger>
  <SelectContent>
    {availableBlocks.map((block) => (
      <SelectItem key={block} value={block.toString()}>
        Block {block}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Avantages de Radix UI Select

### 1. Accessibilité
- **Navigation clavier** complète (flèches, Enter, Escape)
- **Support des lecteurs d'écran** avec ARIA
- **Focus management** automatique
- **Annonces vocales** des changements de sélection

### 2. Expérience utilisateur
- **Animations fluides** d'ouverture/fermeture
- **Recherche par frappe** dans les options
- **Indicateur visuel** de sélection
- **Scroll automatique** vers l'élément sélectionné

### 3. Personnalisation
- **Styles CSS** entièrement personnalisables
- **Variants** et **tailles** configurables
- **Icônes** et **contenus** personnalisés
- **Positionnement** flexible (popper/item-aligned)

### 4. Robustesse
- **Gestion des états** (disabled, loading, error)
- **Validation** intégrée
- **Performance** optimisée avec virtualisation
- **SSR** compatible

## Styles personnalisés

### CSS pour le WelcomeModal
```css
/* Trigger styling */
.welcome-modal [data-radix-select-trigger] {
  height: 60px !important;
  padding: 1rem !important;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

/* Focus state */
.welcome-modal [data-radix-select-trigger]:focus {
  border-color: var(--color-white) !important;
  background-color: white;
  box-shadow: 0 0 0 2px var(--color-white);
}

/* Content styling */
.welcome-modal [data-radix-select-content] {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
}

/* Item hover/selection */
.welcome-modal [data-radix-select-item]:hover,
.welcome-modal [data-radix-select-item][data-highlighted] {
  background-color: var(--color-green);
  color: white;
}
```

## Fonctionnalités avancées

### 1. États de chargement
```jsx
<Select disabled={!blockNumber || isLotsLoading}>
  <SelectTrigger>
    <SelectValue 
      placeholder={
        isLotsLoading ? "Loading lots..." : "Select a lot"
      } 
    />
  </SelectTrigger>
  <SelectContent>
    {/* Items */}
  </SelectContent>
</Select>
```

### 2. Sélection conditionnelle
- Les lots ne sont disponibles qu'après sélection d'un bloc
- Placeholder dynamique selon l'état
- Désactivation automatique pendant le chargement

### 3. Validation en temps réel
- Intégration avec TanStack Query
- Validation des données avant soumission
- Messages d'erreur contextuels

## Comparaison des performances

### HTML Select natif
- ❌ Styles limités
- ❌ Accessibilité basique
- ❌ Pas d'animations
- ✅ Léger (0 KB)

### Radix UI Select
- ✅ Accessibilité complète
- ✅ Styles entièrement personnalisables
- ✅ Animations fluides
- ✅ UX moderne
- ⚠️ Bundle plus lourd (+50 KB)

## Utilisation dans d'autres composants

### Exemple basique
```jsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

<Select defaultValue="option1">
  <SelectTrigger>
    <SelectValue placeholder="Choose an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3" disabled>Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Avec groupes et séparateurs
```jsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select item" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Group 1</SelectLabel>
      <SelectItem value="item1">Item 1</SelectItem>
      <SelectItem value="item2">Item 2</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Group 2</SelectLabel>
      <SelectItem value="item3">Item 3</SelectItem>
      <SelectItem value="item4">Item 4</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

## Prochaines améliorations possibles

1. **Multi-select** : Sélection multiple avec checkboxes
2. **Recherche** : Champ de recherche intégré
3. **Virtualisation** : Pour de très grandes listes
4. **Groupes dynamiques** : Organisation automatique des options
5. **Validation visuelle** : Indicateurs de validation en temps réel

## Migration depuis les selects natifs

### Checklist de migration
- [ ] Remplacer `<select>` par `<Select>`
- [ ] Remplacer `<option>` par `<SelectItem>`
- [ ] Changer `onChange` en `onValueChange`
- [ ] Ajouter `<SelectTrigger>` et `<SelectValue>`
- [ ] Envelopper les items dans `<SelectContent>`
- [ ] Ajuster les styles CSS
- [ ] Tester l'accessibilité

Cette intégration transforme l'expérience de sélection en une interface moderne, accessible et performante ! 🚀
