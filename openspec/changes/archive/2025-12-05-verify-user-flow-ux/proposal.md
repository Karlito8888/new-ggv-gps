# Proposal: verify-user-flow-ux

## Summary

Audit complet du flux utilisateur de l'application MyGGV GPS pour vérifier la fluidité de l'expérience de bout en bout.

## Background

L'application suit un flux de navigation séquentiel :
1. **GpsPermissionPage** (`/`) → Demande permission GPS
2. **WelcomePage** (`/welcome`) → Sélection destination (Block/Lot)
3. **NavigatePage** (`/navigate?block=X&lot=Y`) → Navigation turn-by-turn
4. **ArrivedPage** (`/arrived?block=X&lot=Y`) → Confirmation d'arrivée
5. **Choix utilisateur** → Nouvelle destination ou Sortie du village
6. **NavigatePage** (`/navigate?exit=true`) → Navigation vers sortie (si exit)
7. **ExitCompletePage** (`/exit-complete`) → Confirmation de sortie

## Audit Results

### Points positifs (✅ Fonctionnel)

| Composant | Statut | Notes |
|-----------|--------|-------|
| Structure routing | ✅ | Routes React Router bien définies |
| Carte persistante | ✅ | MapLayout garde la carte montée |
| URL-based state | ✅ | Destination dans params pour refresh |
| Animations | ✅ | Framer Motion + AnimatePresence |
| Détection arrivée | ✅ | `hasArrived()` avec seuil 10m |
| Flux exit village | ✅ | Comparaison `VILLAGE_EXIT_COORDS` |
| Route protection | ✅ | Guards avec redirections appropriées |

### Issues mineures identifiées

| Issue | Sévérité | Impact |
|-------|----------|--------|
| `isExitMode` prop non utilisé dans NavigationDisplay | Faible | Dead code, nettoyage recommandé |
| Redirection affiche message 1.5s avant navigate | Faible | UX légèrement perturbé sur deep-link invalide |

## Recommendation

**Aucun changement critique requis.** Le flux est bien implémenté et respecte les spécifications documentées dans `navigation-routing/spec.md`.

### Améliorations optionnelles (hors scope)
1. Supprimer la prop `isExitMode` inutilisée de `NavigationDisplay`
2. Réduire le délai de redirection de 1.5s à 0.5s pour les guards

## Decision

- [ ] **APPROVE** - Flux vérifié, aucune modification requise
- [ ] **APPROVE with cleanup** - Appliquer les améliorations mineures
- [ ] **REJECT** - Problèmes critiques identifiés

## Files Reviewed

- `src/pages/GpsPermissionPage.jsx`
- `src/pages/WelcomePage.jsx`
- `src/pages/NavigatePage.jsx`
- `src/pages/ArrivedPage.jsx`
- `src/pages/ExitCompletePage.jsx`
- `src/layouts/MapLayout.jsx`
- `src/components/NavigationDisplay.jsx`
- `src/hooks/useRouteManager.js`
- `src/lib/navigation.js`
- `src/contexts/NavigationContext.jsx`
- `src/components/AnimatedOutlet.jsx`
- `src/lib/animations.js`
- `src/router.jsx`
