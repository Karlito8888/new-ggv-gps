# Guide de la Boussole - Vrai Nord Géographique

## 🧭 Fonctionnalités

Cette PWA dispose maintenant d'une boussole qui indique le **vrai nord géographique** (pas seulement l'orientation relative).

## 🎯 Comment ça marche

### Détection automatique du vrai nord

1. **iOS Safari** : Utilise `webkitCompassHeading` qui fournit directement le vrai nord
2. **Android Chrome/Firefox** : Utilise `deviceorientationabsolute` avec correction automatique
3. **Fallback** : Orientation relative avec possibilité de calibration manuelle

### Indicateurs visuels

- **🟢 Point vert** : Boussole active et fonctionnelle
- **⚠️ Point orange** : Calibration manuelle nécessaire
- **🧭 Bouton "Calibrer Nord"** : Apparaît quand la calibration est nécessaire

## 📱 Instructions d'utilisation

### Activation de la boussole

1. Appuyez sur le bouton boussole (cercle avec N, E, S, W)
2. Accordez les permissions d'orientation si demandées
3. La boussole s'active automatiquement

### Calibration manuelle (si nécessaire)

Si vous voyez l'indicateur ⚠️ et le bouton "🧭 Calibrer Nord" :

1. **Pointez votre téléphone vers le nord géographique**
   - Utilisez une vraie boussole ou Google Maps pour référence
   - Le nord géographique est différent du nord magnétique
2. **Appuyez sur "🧭 Calibrer Nord"**
3. La boussole affichera "✅ Calibré !" pendant 2 secondes
4. Votre boussole indique maintenant le vrai nord !

## 🔍 Vérification du bon fonctionnement

### Logs de débogage

Ouvrez la console développeur (F12) pour voir :

```
🧭 iOS Compass Heading (True North): 45.2
🔍 Debug Compass: {
  alpha: 314.8,
  absolute: true,
  webkitCompassHeading: 45.2,
  calculatedBearing: 45.2,
  calibratedBearing: 45.2,
  calibrationOffset: 0
}
```

### Test pratique

1. Pointez votre téléphone vers le nord géographique
2. La valeur dans les logs devrait être proche de 0°
3. La boussole sur la carte devrait pointer vers le haut (nord)

## 🌍 Précision géographique

- **Excellente** : En extérieur, loin des interférences métalliques
- **Bonne** : En ville, avec quelques bâtiments
- **Réduite** : Près de structures métalliques, véhicules, ou à l'intérieur

## 🔧 Dépannage

### La boussole ne s'active pas

- Vérifiez que vous êtes en HTTPS
- Accordez les permissions d'orientation
- Redémarrez l'application

### La boussole pointe dans la mauvaise direction

- Utilisez la calibration manuelle
- Éloignez-vous des interférences métalliques
- Vérifiez que vous pointez vers le nord géographique (pas magnétique)

### Différence entre nord magnétique et géographique

- **Nord magnétique** : Direction du pôle magnétique terrestre
- **Nord géographique** : Direction du pôle nord géographique (vraie)
- **Déclinaison** : Différence entre les deux (varie selon la localisation)

Cette PWA corrige automatiquement cette différence pour vous donner le vrai nord géographique !
