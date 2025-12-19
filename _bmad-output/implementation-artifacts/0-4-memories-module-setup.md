# Story 0.4: Memories Module Setup

Status: ready-for-dev

## Story

As a Lead Architect,
I want to initialize the `memories` module,
So that the core domain logic has a dedicated home.

## Acceptance Criteria

1. **Given** the backend `src/memories` directory
   **When** I create the folder structure
   **Then** it must contain `README.md` defining the Memory entity and PostGIS requirements

2. **And** it must contain `AGENTS.md` specifying: "Memories depends on Auth and Media. It is the source of truth for the Map."

## Tasks / Subtasks

- [ ] Initialize `backend/src/memories` directory structure
- [ ] Create `README.md` documenting Domain Entities (Memory) and Geo-Spatial requirements
- [ ] Create `AGENTS.md` with dependency rules
- [ ] Setup `entities/`, `dto/`, `controllers/` folders placeholders

## Dev Notes
- **Constraint:** Core Domain. Heavily dependent on PostGIS (`geography` type).
- **Reference:** `04-CORE-DECISIONS.md` - Decision 1 (TypeORM), Decision 3 (GiST Index).

## File List
- backend/src/memories/*
