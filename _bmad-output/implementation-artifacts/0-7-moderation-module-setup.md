# Story 0.7: Moderation Module Setup

Status: ready-for-dev

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

- [ ] Initialize `backend/src/moderation` directory structure
- [ ] Create `README.md` documenting Reporting & Review flows
- [ ] Create `AGENTS.md` with dependency rules (Consumes events)
- [ ] Setup `entities/` (ReportEntity) placeholder

## Dev Notes
- **Constraint:** Heavily RBAC dependent (Moderator role).
- **Reference:** `04-CORE-DECISIONS.md` - Decision 5 (RBAC).

## File List
- backend/src/moderation/*
