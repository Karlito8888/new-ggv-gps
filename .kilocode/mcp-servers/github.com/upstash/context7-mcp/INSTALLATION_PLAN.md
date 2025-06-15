# Plan d'installation Context7 MCP Server

## Configuration requise

### 1. Fichier mcp_settings.json (à créer à la racine)
```json
{
  "mcpServers": {
    "github.com/upstash/context7-mcp": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "disabled": false,
      "autoApprove": [],
      "timeout": 60,
      "transportType": "stdio"
    }
  }
}
```

### 2. Commandes d'installation à exécuter
```bash
# Tester l'installation du package
npx -y @upstash/context7-mcp@latest --help

# Vérifier la connectivité avec l'inspecteur MCP (optionnel)
npx -y @modelcontextprotocol/inspector npx @upstash/context7-mcp
```

## Outils disponibles après installation

### resolve-library-id
- **Description**: Résout un nom de bibliothèque général en ID compatible Context7
- **Paramètre requis**: `libraryName` - Le nom de la bibliothèque à rechercher

### get-library-docs
- **Description**: Récupère la documentation d'une bibliothèque
- **Paramètres**:
  - `context7CompatibleLibraryID` (requis): ID exact compatible Context7 (ex: `/mongodb/docs`, `/vercel/next.js`)
  - `topic` (optionnel): Concentrer la doc sur un sujet spécifique (ex: "routing", "hooks")
  - `tokens` (optionnel, défaut 10000): Nombre max de tokens à retourner

## Tests de démonstration prévus

### Test 1: Résolution d'ID de bibliothèque
```
Utiliser resolve-library-id avec "react" pour obtenir l'ID Context7 de React
```

### Test 2: Documentation MapLibre
```
Utiliser get-library-docs avec l'ID MapLibre pour obtenir la documentation de navigation
```

### Test 3: Documentation Supabase
```
Utiliser get-library-docs avec l'ID Supabase pour obtenir des exemples d'intégration
```

## Intégration avec MyGGV-GPS

Le serveur Context7 sera particulièrement utile pour :
- **React 19** : Hooks et composants à jour
- **MapLibre GL JS** : API de cartographie récentes
- **Supabase** : Intégrations et meilleures pratiques
- **Vite/PWA** : Configurations et optimisations

## Prochaines étapes

1. Créer le fichier `mcp_settings.json` à la racine
2. Tester l'installation avec npx
3. Démontrer les capacités avec les outils disponibles
4. Intégrer dans le workflow de développement MyGGV-GPS

## Notes techniques

- **Transport**: stdio (communication locale sécurisée)
- **Timeout**: 60 secondes pour éviter les blocages
- **Auto-approve**: Vide pour contrôle manuel
- **Compatibilité**: Node.js ≥18.0.0 (confirmé dans package.json)