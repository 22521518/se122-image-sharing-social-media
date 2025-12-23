# Story 0.2: Auth Module Setup

Status: done

## Story

As a Lead Architect,
I want to initialize the `auth` module with its structure and rules,
So that user management is isolated and secure.

## Acceptance Criteria

1. **Given** the backend `src/auth` directory
   **When** I create the folder structure
   **Then** it must contain `README.md` describing the JWT flow and User entity ownership

2. **And** it must contain `AGENTS.md` specifying: "Auth depends ONLY on Common. Do not import Memories or Social."

## Tasks / Subtasks

- [x] Initialize `backend/src/auth` directory structure
- [x] Create `README.md` documenting JWT Access (15m) + Refresh (7d) strategy
- [x] Create `AGENTS.md` with dependency rules
- [x] Setup `dto/`, `guards/`, `strategies/` folders placeholders
- [x] Note: Actual Auth logic implementation is in Story 1.1, this is purely structural setup and documentation.

## Dev Notes
- **Dependencies:** Imports `common`.
- **Constraint:** Auth represents the Core. Other modules import Auth (for Guards), but Auth should generally not import them.
- **Reference:** `06-PROJECT-STRUCTURE.md` - Decision 4.

## Dev Agent Record

### Implementation Notes
- Created `AuthModule` in `backend/v1_nestjs/src/auth`.
- Established `README.md` with JWT strategy details.
- Established `AGENTS.md` with strict dependency rules.
- Created placeholder directories for `dto`, `guards`, and `strategies`.
- Verified all files exist.

## File List
- backend/v1_nestjs/src/auth/README.md
- backend/v1_nestjs/src/auth/AGENTS.md
- backend/v1_nestjs/src/auth/auth.module.ts
- backend/v1_nestjs/src/auth/dto/.gitkeep
- backend/v1_nestjs/src/auth/guards/.gitkeep
- backend/v1_nestjs/src/auth/strategies/.gitkeep
