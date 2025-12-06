# Change: Migrate to Bun Package Manager

## Why

The project currently uses npm for dependency management with several unused dependencies (clsx, react-icons, react-mobile-picker, daisyui) that bloat the bundle and increase installation time. Bun offers faster installation, native TypeScript support, and improved developer experience while providing full npm compatibility.

## What Changes

- Audit and remove unused dependencies: `clsx`, `react-icons`, `react-mobile-picker`, `daisyui`
- Install Bun package manager on the system
- Replace `package-lock.json` with `bun.lockb`
- Update all npm scripts to use Bun equivalents
- Migrate from npm to Bun for dependency installation and script execution
- Update documentation to reflect Bun usage
- **BREAKING**: Developers will need to install Bun to work on the project

## Impact

- **Affected specs**: dependency-management (new capability)
- **Affected code**: 
  - `package.json` - Scripts and dependency cleanup
  - `CLAUDE.md` - Update commands from `npm run` to `bun run`
  - `README.md` (if exists) - Installation instructions
  - `.gitignore` - Replace npm lock with Bun lock
  - Netlify build configuration (if using npm-specific commands)
- **Performance impact**: Faster installation (2-3x), faster script execution
- **Team impact**: All developers must install Bun
