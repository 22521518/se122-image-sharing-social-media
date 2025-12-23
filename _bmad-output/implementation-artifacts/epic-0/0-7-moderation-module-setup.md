# Story 0.7: Moderation Module Setup

Status: done

## Story

As a Lead Architect,
I want to initialize the `moderation` module,
So that safety tools are centralized.

## Acceptance Criteria

1. **Given** the backend `src/moderation` directory
   **When** I create the folder structure
   **Then** it must contain `README.md` documenting the reporting workflow

2. **And** it must contain `AGENTS.md` specifying: "Moderation consumes events from other modules. It has Moderator-only guards."

## Tasks / Subtasks

- [x] Initialize `backend/src/moderation` directory structure
- [x] Create `README.md` documenting Reporting & Review flows
- [x] Create `AGENTS.md` with dependency rules (Consumes events)
- [x] Setup `entities/` (ReportEntity) placeholder

## Dev Notes
- **Constraint:** Heavily RBAC dependent (Moderator role).
- **Reference:** `04-CORE-DECISIONS.md` - Decision 5 (RBAC).

## Dev Agent Record

### Implementation Notes
- Created `ModerationModule` in `backend/v1_nestjs/src/moderation`.
- Established `README.md` and `AGENTS.md`.
- Created placeholders for `entities`, `dto`, `controllers`, `services`.
- Verified all files exist.

## File List
- backend/v1_nestjs/src/moderation/README.md
- backend/v1_nestjs/src/moderation/AGENTS.md
- backend/v1_nestjs/src/moderation/moderation.module.ts
- backend/v1_nestjs/src/moderation/entities/.gitkeep
- backend/v1_nestjs/src/moderation/dto/.gitkeep
- backend/v1_nestjs/src/moderation/controllers/.gitkeep
- backend/v1_nestjs/src/moderation/services/.gitkeep
