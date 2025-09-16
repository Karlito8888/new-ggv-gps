# 🚀 Guide de Release - MyGGV GPS

## 📋 Checklist de Release

### ✅ **Avant la release :**
1. **Tests** : `npm run build` et `npm run lint` passent
2. **Version** : Mise à jour dans `package.json` et `Footer.jsx`
3. **Changelog** : Documenter les changements dans `CHANGELOG.md`
4. **Documentation** : Mettre à jour si nécessaire

### ✅ **Process de release :**

#### **1. Mise à jour version automatique :**
```bash
# Utiliser le script automatique
npm run version:update 1.0.7

# Ou manuellement
node scripts/update-version.js 1.0.7
```

#### **2. Vérifications :**
```bash
# Installer les dépendances
npm install

# Tester le build
npm run build

# Vérifier le linting
npm run lint

# Tester localement (optionnel)
npm run dev
```

#### **3. Commit et tag :**
```bash
# Commit des changements
git add .
git commit -m "chore: bump version to 1.0.7"

# Créer le tag
git tag v1.0.7

# Push avec tags
git push origin main --tags
```

#### **4. Déploiement :**
```bash
# Netlify se déclenche automatiquement sur push
# Vérifier le déploiement sur https://myggv-gps.netlify.app
```

## 📝 **Convention de versioning**

### **Format : X.Y.Z (Semantic Versioning)**
- **X (Major)** : Changements incompatibles
- **Y (Minor)** : Nouvelles fonctionnalités compatibles
- **Z (Patch)** : Corrections de bugs

### **Exemples :**
- `1.0.6` → `1.0.7` : Corrections de bugs
- `1.0.7` → `1.1.0` : Nouvelles fonctionnalités
- `1.1.0` → `2.0.0` : Changements majeurs

## 🏷️ **Types de releases**

### **Patch (1.0.6 → 1.0.7) :**
- Corrections de bugs
- Optimisations performance
- Améliorations UI mineures

### **Minor (1.0.7 → 1.1.0) :**
- Nouvelles fonctionnalités
- Améliorations majeures
- Nouvelles API

### **Major (1.1.0 → 2.0.0) :**
- Refactoring complet
- Changements d'architecture
- Breaking changes

## 📋 **Template Changelog**

```markdown
## [X.Y.Z] - YYYY-MM-DD

### ✨ **Nouvelles fonctionnalités :**
- Feature 1
- Feature 2

### 🔧 **Améliorations :**
- Amélioration 1
- Amélioration 2

### 🐛 **Corrections :**
- Bug fix 1
- Bug fix 2

### 📱 **Compatibilité :**
- Plateforme 1
- Plateforme 2
```

## 🔄 **Automatisation future**

### **GitHub Actions (à implémenter) :**
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy
        run: |
          npm install
          npm run build
          # Deploy to Netlify
```

### **Scripts NPM disponibles :**
- `npm run version:update <version>` : Mise à jour automatique
- `npm run build` : Build production
- `npm run lint` : Vérification code
- `npm run dev` : Développement local

## 📊 **Métriques de release**

### **Taille bundle (v1.0.6) :**
- **CSS** : 775.33 kB (94.82 kB gzipped)
- **JS Principal** : 426.66 kB (132.53 kB gzipped)
- **Maps** : 959.65 kB (255.54 kB gzipped)
- **Total** : ~2.2 MB (~500 kB gzipped)

### **Performance :**
- **Build time** : ~10 secondes
- **Lighthouse** : 90+ sur mobile
- **PWA** : Installable et fonctionnelle

## 🎯 **Prochaines améliorations**

### **v1.0.7 (Patch) :**
- Optimisations performance
- Corrections bugs mineurs

### **v1.1.0 (Minor) :**
- Mode offline amélioré
- Multi-langues support

### **v2.0.0 (Major) :**
- Architecture refactoring
- Nouvelles APIs