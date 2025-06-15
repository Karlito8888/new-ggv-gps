# Context7 MCP Server

Ce répertoire contient la configuration pour le serveur MCP Context7 qui fournit une documentation à jour pour les bibliothèques utilisées dans le projet MyGGV-GPS.

## Serveur installé
- **Nom**: github.com/upstash/context7-mcp
- **Package**: @upstash/context7-mcp@latest
- **Transport**: stdio via npx

## Outils disponibles
- `resolve-library-id`: Résout un nom de bibliothèque en ID compatible Context7
- `get-library-docs`: Récupère la documentation d'une bibliothèque

## Utilisation
Le serveur est configuré dans `mcp_settings.json` et peut être utilisé pour obtenir de la documentation à jour pour:
- React 19
- MapLibre GL JS
- Supabase
- Vite/PWA
- Et autres bibliothèques du projet