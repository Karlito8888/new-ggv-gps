# 📋 Changelog - MyGGV GPS

## [1.0.6] - 2025-01-16

### 🎯 **PWA Layout Fixes & Optimizations**

#### ✨ **Nouvelles fonctionnalités :**
- **PWA Layout optimisé** : Header et Footer utilisent maintenant tout l'écran
- **Safe Areas support** : Gestion complète des encoches, Dynamic Island, Home Indicator
- **Géolocalisation Desktop** : Support amélioré pour ordinateurs avec messages adaptatifs
- **Orientation responsive** : Layout optimisé portrait/landscape

#### 🔧 **Améliorations techniques :**
- **Standardisation Turf.js** : Tous les calculs géographiques utilisent maintenant Turf.js
- **Suppression code mort** : 6 fonctions orphelines supprimées (~200 lignes)
- **Fallback système** : 25+ systèmes de fallback pour robustesse maximale
- **Routing cascade** : 4 niveaux de fallback (OSRM → MapLibre → ORS → Direct)

#### 🐛 **Corrections :**
- **Header masqué** : Contenu maintenant visible sous l'encoche
- **Espace blanc Footer** : Supprimé grâce aux safe areas
- **Viewport PWA** : Layout stable quand installée comme app
- **Linting errors** : Paramètres inutilisés supprimés

#### 📱 **Compatibilité :**
- **iPhone** : Encoche, Dynamic Island, Home Indicator
- **Android** : Navigation gestures, Status bar
- **Desktop** : Géolocalisation IP/WiFi avec messages adaptatifs
- **PWA Standalone** : Layout parfait quand installée

---

## [1.0.5] - 2025-01-15

### 🚀 **Version précédente**
- Fonctionnalités de base GPS
- Navigation MapLibre
- Interface utilisateur mobile
- Système de routing OSRM

---

## 🎯 **Prochaines versions**

### [1.0.7] - Planifiée
- **Performance optimizations**
- **Offline mode amélioré**
- **Analytics intégrées**

### [1.1.0] - Planifiée  
- **Multi-langues support**
- **Thèmes personnalisables**
- **Partage de localisation**