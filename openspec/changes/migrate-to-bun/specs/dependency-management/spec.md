# Dependency Management Specification

## ADDED Requirements

### Requirement: Bun Package Manager
The project SHALL use Bun as the primary package manager for dependency installation and management.

#### Scenario: Fresh installation
- **GIVEN** a developer clones the repository
- **WHEN** they run `bun install`
- **THEN** all dependencies install successfully
- **AND** a `bun.lockb` file is generated/updated

#### Scenario: Script execution
- **GIVEN** the project has been set up with Bun
- **WHEN** a developer runs `bun run dev`
- **THEN** the development server starts correctly
- **AND** all Vite functionality works as expected

#### Scenario: Build process
- **GIVEN** the project uses Bun
- **WHEN** `bun run build` is executed
- **THEN** the production build completes successfully
- **AND** the output is identical to npm-based builds

### Requirement: Minimal Dependencies
The project SHALL only include dependencies that are actively imported and used in the codebase.

#### Scenario: Dependency audit
- **GIVEN** the package.json file
- **WHEN** all dependencies are reviewed
- **THEN** every listed dependency has at least one import statement in src/
- **AND** no unused packages are present

#### Scenario: Removed unused packages
- **GIVEN** the dependency cleanup is complete
- **WHEN** the following packages are checked: clsx, react-icons, react-mobile-picker, daisyui
- **THEN** none of these packages appear in package.json
- **AND** no imports reference these packages in the codebase

### Requirement: Lock File Management
The project SHALL use Bun's native lock file format instead of package-lock.json.

#### Scenario: Lock file presence
- **GIVEN** a project using Bun
- **WHEN** dependencies are installed
- **THEN** a `bun.lockb` file exists in the root directory
- **AND** no `package-lock.json` file exists

#### Scenario: Git tracking
- **GIVEN** the .gitignore configuration
- **WHEN** lock files are considered
- **THEN** `bun.lockb` is tracked in git
- **AND** `package-lock.json` is ignored (if present)

### Requirement: CI/CD Compatibility
The project SHALL maintain compatibility with Netlify deployment using Bun.

#### Scenario: Netlify auto-detection
- **GIVEN** the project is deployed to Netlify
- **WHEN** `bun.lockb` is present in the repository
- **THEN** Netlify automatically uses Bun for dependency installation
- **AND** the build succeeds without manual configuration

#### Scenario: Build command execution
- **GIVEN** Netlify is configured with build command `bun run build:netlify`
- **WHEN** a deployment is triggered
- **THEN** all build steps execute successfully
- **AND** the deployed site functions identically to npm-based builds

### Requirement: Developer Documentation
The project documentation SHALL accurately reflect Bun usage for all dependency and script operations.

#### Scenario: Command documentation
- **GIVEN** the CLAUDE.md file
- **WHEN** developers read the Commands section
- **THEN** all examples use `bun run` instead of `npm run`
- **AND** Bun installation instructions are provided

#### Scenario: Installation requirements
- **GIVEN** the project README or CLAUDE.md
- **WHEN** a new developer reviews setup instructions
- **THEN** Bun installation is listed as a prerequisite
- **AND** a link to https://bun.sh is provided
