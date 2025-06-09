# Guide de Déploiement Netlify - MyGGV|GPS

## 🚀 Configuration Netlify

### 1. Paramètres de Build
```
Build command: npm run build
Publish directory: dist
Node version: 18
```

### 2. Variables d'Environnement
Dans Netlify Dashboard > Site settings > Environment variables, ajouter :

```
VITE_SUPABASE_URL=https://wlrrruemchacgyypexsu.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
VITE_SUPABASE_SERVICE_ROLE_KEY=votre_clé_service
VITE_SUPABASE_STORAGE_URL=https://wlrrruemchacgyypexsu.supabase.co/storage/v1/object/public
REACT_APP_GOOGLE_API_KEY=votre_clé_google
VITE_OPENROUTE_API_KEY=votre_clé_openroute
```

### 3. Domaine et HTTPS
- ✅ HTTPS obligatoire pour PWA et géolocalisation
- ✅ Configurer un domaine personnalisé si nécessaire
- ✅ Headers de sécurité automatiquement configurés

## 📱 Optimisations PWA

### Cache Strategy
- **Service Worker** : Auto-update activé
- **OSM Tiles** : Cache 7 jours (200 entrées max)
- **Images** : Cache 30 jours (100 entrées max)
- **Supabase API** : NetworkFirst avec timeout 5s

### Manifest
- ✅ Tous les formats d'icônes inclus
- ✅ Orientation portrait optimisée
- ✅ Catégories : navigation, travel, utilities
- ✅ Support offline partiel

## 🔧 Déploiement

### Méthode 1: Git Auto-Deploy
1. Connecter le repo GitHub/GitLab à Netlify
2. Les variables d'environnement seront automatiquement injectées
3. Deploy automatique à chaque push sur main

### Méthode 2: CLI Netlify
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Méthode 3: Manual Upload
```bash
# Build local
npm run build

# Upload du dossier dist/ via Netlify Dashboard
```

## ✅ Checklist Post-Déploiement

- [ ] App accessible via HTTPS
- [ ] PWA installable (bouton "Ajouter à l'écran d'accueil")
- [ ] Géolocalisation fonctionne
- [ ] Service Worker activé (vérifier dans DevTools)
- [ ] Cache OSM tiles opérationnel
- [ ] API Supabase accessible
- [ ] Navigation fonctionne hors ligne (partiel)
- [ ] Performance Lighthouse > 90

## 🐛 Troubleshooting

### Erreur 404 sur refresh
- ✅ Fichier `_redirects` configuré
- ✅ Fichier `netlify.toml` configuré

### PWA non installable
- Vérifier HTTPS
- Vérifier manifest.webmanifest
- Vérifier service worker

### Géolocalisation bloquée
- Vérifier HTTPS
- Vérifier permissions dans headers

### Performance lente
- Activer compression Gzip (auto sur Netlify)
- Vérifier cache headers
- Optimiser images si nécessaire

## 📊 Monitoring

### Netlify Analytics
- Activer dans Dashboard > Analytics
- Surveiller temps de chargement
- Surveiller erreurs 404/500

### Performance
```bash
# Test local
npm run build
npm run serve
# Lighthouse audit sur localhost:3000
```

## 🔄 Mises à Jour

### Déploiement Continu
- Push sur `main` → Deploy automatique
- Service Worker se met à jour automatiquement
- Cache invalidé automatiquement pour nouveaux assets

### Variables d'Environnement
- Modifiables dans Netlify Dashboard
- Redéploiement nécessaire après modification