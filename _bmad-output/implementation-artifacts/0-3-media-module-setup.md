# Story 0.3: Media Module Setup

Status: ready-for-dev

## Story

As a Lead Architect,
I want to initialize the `media` module,
So that file handling logic is centralized and decoupled from business logic.

## Acceptance Criteria

1. **Given** the backend `src/media` directory
   **When** I create the folder structure
   **Then** it must contain `README.md` documenting the S3 streaming and Sharp.js pipeline

2. **And** it must contain `AGENTS.md` specifying: "Media is a service provider. It does not know about Users or Memories."

## Tasks / Subtasks

- [ ] Initialize `backend/src/media` directory structure
- [ ] Create `README.md` documenting S3 Direct Upload & Sharp.js strategy
- [ ] Create `AGENTS.md` with dependency rules (Service Provider pattern)
- [ ] Setup `services/` folder placeholder

## Dev Notes
- **Constraint:** Pure utility module for file handling. No business logic.
- **Reference:** `04-CORE-DECISIONS.md` - Decision 10 & 11 (Streaming to S3, Sharp.js).

## File List
- backend/src/media/*
