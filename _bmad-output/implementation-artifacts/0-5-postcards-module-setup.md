# Story 0.5: Postcards Module Setup

Status: ready-for-dev

## Story

As a Lead Architect,
I want to initialize the `postcards` module as a top-level domain,
So that time-locked logic is not buried within social features.

## Acceptance Criteria

1. **Given** the backend `src/postcards` directory
   **When** I create the folder structure
   **Then** it must contain `README.md` explaining the "Locked" vs "Unlocked" state machine

2. **And** it must contain `AGENTS.md` specifying: "Postcards depends on Auth and Media. Independent of Memories module."

## Tasks / Subtasks

- [ ] Initialize `backend/src/postcards` directory structure
- [ ] Create `README.md` documenting Logic for Time-Locked / Location-Triggered cards
- [ ] Create `AGENTS.md` with dependency rules (Top-level domain status)
- [ ] Setup `entities/`, `dto/` folder placeholders

## Dev Notes
- **Structural Decision:** Elevated to top-level module (Decision 1 in `06-PROJECT-STRUCTURE.md`) because of independent lifecycle.
- **Reference:** `06-PROJECT-STRUCTURE.md`.

## File List
- backend/src/postcards/*
