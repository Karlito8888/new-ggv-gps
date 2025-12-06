# Design: Bun Migration

## Context

The project currently uses npm with 23 dependencies, but analysis shows 4 are unused (clsx, react-icons, react-mobile-picker, daisyui). Additionally, daisyui is mentioned in documentation but no Tailwind config exists—the project uses custom CSS variables instead.

**Current state:**
- Package manager: npm
- Total dependencies: 10 production + 13 dev
- Unused: clsx, react-icons, react-mobile-picker, daisyui
- Build tool: Vite 6.3
- Node version: >=18.0.0

**Constraints:**
- Must maintain compatibility with Netlify deployment
- Must preserve all existing functionality
- Must not break ESLint, Vite, or React builds

## Goals / Non-Goals

**Goals:**
- Remove all unused dependencies to reduce bundle size
- Migrate from npm to Bun for faster installs (2-3x speed improvement)
- Maintain 100% feature parity
- Update all documentation to reflect Bun usage

**Non-Goals:**
- Rewriting any application code
- Changing build tool (keep Vite)
- Migrating to Bun's built-in bundler (stay with Vite)
- Using Bun runtime (keep Node.js for Netlify compatibility)

## Decisions

### Decision 1: Use Bun as package manager only (not runtime)

**Rationale:**
- Bun has excellent npm compatibility for package management
- Netlify supports Bun for dependency installation
- Vite continues to work seamlessly with Bun
- Lower risk than full runtime migration

**Alternatives considered:**
- Full Bun runtime migration → Rejected: Higher risk, Netlify support unclear
- Stay with npm → Rejected: Misses performance benefits
- Use pnpm → Rejected: Less performance gain than Bun, more complex

### Decision 2: Remove daisyui despite documentation references

**Rationale:**
- No Tailwind config exists in the project
- Code uses custom CSS variables, not Tailwind/DaisyUI classes
- Documentation appears outdated from previous architecture
- Removing saves ~500KB in node_modules

**Migration path:**
- Verify no daisyui classes in code via grep
- Remove from package.json
- Update CLAUDE.md to remove daisyui references

### Decision 3: Keep all Radix UI packages

**Rationale:**
- `@radix-ui/themes` imported in main.jsx
- `@radix-ui/react-dialog` and `@radix-ui/react-select` used for UI components
- All three are actively used

### Decision 4: Preserve package.json scripts as-is

**Rationale:**
- Bun is fully compatible with npm script syntax
- No changes needed to scripts themselves
- Developers just use `bun run` instead of `npm run`

## Unused Dependencies Analysis

| Package | Why Unused | Safe to Remove |
|---------|-----------|----------------|
| `clsx` | No imports found in src/ | ✅ Yes |
| `react-icons` | No imports found in src/ | ✅ Yes |
| `react-mobile-picker` | No imports found in src/ | ✅ Yes |
| `daisyui` | No Tailwind config, uses custom CSS | ✅ Yes |

## Risks / Trade-offs

**Risk 1: Developer onboarding friction**
- Impact: Medium - Developers need to install Bun
- Mitigation: Clear documentation in README and CLAUDE.md
- Rollback: Can revert to npm if needed (preserve package.json)

**Risk 2: Netlify build issues**
- Impact: Low - Netlify officially supports Bun
- Mitigation: Test deployment before merging
- Rollback: Netlify can fallback to npm if bun.lockb removed

**Risk 3: Missing transitive dependencies**
- Impact: Low - Unused packages have no dependents
- Mitigation: Full build + lint + preview test before committing
- Rollback: Reinstall packages if issues found

**Trade-off: Bundle size vs consistency**
- Removing 4 packages saves ~800KB node_modules size
- Minimal impact on final bundle (already tree-shaken)
- Documentation consistency improved (remove outdated daisyui refs)

## Migration Plan

### Phase 1: Audit (15 min)
1. Grep entire codebase for unused package imports
2. Verify no dynamic imports or indirect usage
3. Document findings

### Phase 2: Bun Installation (5 min)
1. Install Bun via official installer
2. Verify version compatibility

### Phase 3: Dependency Cleanup (10 min)
1. Remove unused packages from package.json
2. Delete node_modules and package-lock.json
3. Run `bun install`
4. Test build, lint, dev server

### Phase 4: Documentation (15 min)
1. Update CLAUDE.md commands
2. Update project.md tech stack
3. Update README if exists
4. Update .gitignore

### Phase 5: Validation (20 min)
1. Full build test
2. Dev server test
3. Netlify deployment test
4. Fresh clone test

**Total estimated time:** ~65 minutes

### Rollback Plan
1. Restore package.json from git
2. Delete bun.lockb
3. Run `npm install`
4. Revert documentation changes

**Rollback time:** ~5 minutes

## Open Questions

1. **Q:** Does Netlify require any special configuration for Bun?
   **A:** No, Netlify auto-detects bun.lockb and uses Bun automatically

2. **Q:** Should we update the Node.js engine requirement?
   **A:** No, Bun is package manager only, Node runtime unchanged

3. **Q:** What about developers without Bun?
   **A:** Add clear installation instructions; Bun installer is simple and fast
