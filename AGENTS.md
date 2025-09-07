# AGENTS.md

## Commands
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run build:netlify` - Build with linting and Netlify checks
- No test framework configured - add testing setup if needed

## Code Style
- **Imports**: ES6 modules, named imports preferred, React hooks first
- **Files**: .jsx for components, .js for utilities/libraries
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Constants**: UPPER_SNAKE_CASE for configuration constants
- **Error Handling**: Console logging only (no user-facing errors)
- **Linting**: Modern ESLint with React hooks and refresh plugins
- **Formatting**: No Prettier configured, follow existing patterns
- **Types**: JSDoc comments for complex functions, TypeScript types in @types folder