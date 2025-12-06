# Implementation Tasks

## 1. Dependency Audit and Cleanup

- [x] 1.1 Verify unused dependencies: grep codebase for clsx, react-icons, react-mobile-picker, daisyui imports
- [x] 1.2 Remove unused dependencies from package.json
- [x] 1.3 Test build to ensure no broken imports
- [x] 1.4 Update package.json version to reflect changes

## 2. Bun Installation and Setup

- [x] 2.1 Install Bun on development system (`curl -fsSL https://bun.sh/install | bash`)
- [x] 2.2 Verify Bun installation (`bun --version`)
- [x] 2.3 Remove existing node_modules and package-lock.json
- [x] 2.4 Run `bun install` to generate bun.lockb
- [x] 2.5 Test that all dependencies install correctly

## 3. Script Migration

- [x] 3.1 Update package.json scripts to be Bun-compatible (verify all scripts work)
- [x] 3.2 Test `bun run dev` locally
- [x] 3.3 Test `bun run build` locally
- [x] 3.4 Test `bun run lint` and `bun run lint:fix`
- [x] 3.5 Test `bun run preview`

## 4. Git Configuration

- [x] 4.1 Update .gitignore to include bun.lockb (instead of package-lock.json)
- [x] 4.2 Remove package-lock.json from git tracking
- [x] 4.3 Add bun.lockb to git

## 5. Documentation Updates

- [x] 5.1 Update CLAUDE.md: Replace all `npm run` with `bun run`
- [x] 5.2 Update CLAUDE.md: Add Bun installation requirement
- [x] 5.3 Update README.md (if exists): Add Bun installation instructions
- [x] 5.4 Update openspec/project.md: Add Bun to tech stack

## 6. CI/CD Configuration

- [x] 6.1 Check Netlify build configuration
- [x] 6.2 Update Netlify build command if needed (Netlify supports Bun natively)
- [x] 6.3 Test deployment with Bun

## 7. Validation

- [x] 7.1 Run full build with Bun
- [x] 7.2 Run linter with Bun
- [x] 7.3 Test dev server with Bun
- [x] 7.4 Verify bundle size hasn't increased
- [x] 7.5 Test on clean environment (fresh clone)
