# Story 0.4: Memories Module Setup

Status: review

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

- [x] Initialize `backend/src/memories` directory structure
- [x] Create `README.md` documenting Domain Entities (Memory) and Geo-Spatial requirements
- [x] Create `AGENTS.md` with dependency rules
- [x] Setup `entities/`, `dto/`, `controllers/` folders placeholders

## Dev Notes
- **Constraint:** Core Domain. Heavily dependent on PostGIS (`geography` type).
- **Reference:** `04-CORE-DECISIONS.md` - Decision 1 (TypeORM), Decision 3 (GiST Index).

## Dev Agent Record

### Implementation Notes
- Created `MemoriesModule` in `backend/v1_nestjs/src/memories`.
- Established `README.md` with Domain and PostGIS details.
- Established `AGENTS.md` with strict dependency rules.
- Created placeholder directories for `entities`, `dto`, and `controllers`.
- Verified all files exist.

## File List
- backend/v1_nestjs/src/memories/README.md
- backend/v1_nestjs/src/memories/AGENTS.md
- backend/v1_nestjs/src/memories/memories.module.ts
- backend/v1_nestjs/src/memories/entities/.gitkeep
- backend/v1_nestjs/src/memories/dto/.gitkeep
- backend/v1_nestjs/src/memories/controllers/.gitkeep
