# Story 0.0: Project Scaffolding & CI/CD

Status: done

## Story

As a Lead Architect,
I want to initialize the project repositories and base frameworks,
So that the development team has a standardized environment to work in.

## Acceptance Criteria

1. **Given** a clean environment
   **When** I run the initialization scripts
   **Then** a Monorepo strategy (Turbo or simple folders) is established

2. **And** the `frontend/cross-platform` (Expo) project is initialized
   **When** initialized
   **Then** it follows the structure defined in `06-PROJECT-STRUCTURE.md`

3. **And** the `frontend/web-console` (Vite) project is initialized
   **When** initialized
   **Then** it is optimized for admin dashboard usage as per `implementation-readiness-report`

4. **And** the `backend` (NestJS) project is initialized
   **When** initialized
   **Then** it follow the modular architecture (Acyclic Dependency Graph)

5. **And** a basic CI pipeline (GitHub Actions) runs linting on PRs
   **When** a pull request is opened
   **Then** automated checks verify code quality

## Tasks / Subtasks

- [x] Setup Monorepo / Workspaces structure
- [x] Initialize `backend` with NestJS (`npx @nestjs/cli new ...`)
- [x] Initialize `frontend/cross-platform` with Expo (`npx create-expo-app ...`)
- [x] Initialize `frontend/web-console` with Vite (`npx create-vite ...`)
- [x] Setup shared `package.json` for monorepo (if applicable)
- [x] Add basic `.github/workflows/lint.yml`
- [x] Configure `.eslintrc`, `.prettierrc` for project-wide consistency

## Dev Notes
- **Constraint:** Ensure the directory split between `cross-platform` and `web-console` is respected from day one.
- **Reference:** [Project Structure](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/06-PROJECT-STRUCTURE.md)

## Dev Agent Record

### Implementation Notes
- Verified existing project structure provided by user:
    - Backend: `backend/v1_nestjs`
    - Frontend (Mobile): `frontend/cross-platform`
    - Frontend (Web): `frontend/web-console`
- Created root `package.json` to establish npm workspaces for the above projects.
- Added root `.eslintrc.js` and `.prettierrc` for consistent coding standards.
- Created `.github/workflows/lint.yml` for CI linting.
- Confirmed `frontend/cross-platform` is a valid Expo project.

## File List
- /backend/v1_nestjs
- /frontend/cross-platform
- /frontend/web-console
- /.github/workflows/lint.yml
- /package.json
- /.eslintrc.js
- /.prettierrc
