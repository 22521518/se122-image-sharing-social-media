# Story 0.6: Social Module Setup

Status: review

## Story

As a Lead Architect,
I want to initialize the `social` module with subdomains for feed and discovery,
So that social interactions are organized by subdomain.

## Acceptance Criteria

1. **Given** the backend `src/social` directory
   **When** I create the folder structure with `feed`, `posts`, and `discovery` subdirectories
   **Then** it must contain `README.md` explaining the subdomain split

2. **And** it must contain `AGENTS.md` specifying: "Social depends on Auth and Media. Avoid circular deps with Memories (refer by ID only if possible)."

## Tasks / Subtasks

- [x] Initialize `backend/src/social` directory structure
- [x] Create Subdirectories: `feed/`, `posts/`, `discovery/`, `profiles/`
- [x] Create `README.md` documenting the subdomain strategy
- [x] Create `AGENTS.md` with dependency rules (No Monolithic Service)

## Dev Notes
- **Structural Decision:** Decision 2 in `06-PROJECT-STRUCTURE.md` - Subdivided subdomains.
- Note: Profile management (UC3) straddles Auth and Social. Profile data usually in Social, Auth data (creds) in Auth.

## Dev Agent Record

### Implementation Notes
- Created `SocialModule` in `backend/v1_nestjs/src/social`.
- Created subdirectories: `feed`, `posts`, `discovery`, `profiles`.
- Established `README.md` and `AGENTS.md`.
- Verified all files exist.

## File List
- backend/v1_nestjs/src/social/README.md
- backend/v1_nestjs/src/social/AGENTS.md
- backend/v1_nestjs/src/social/social.module.ts
- backend/v1_nestjs/src/social/feed/.gitkeep
- backend/v1_nestjs/src/social/posts/.gitkeep
- backend/v1_nestjs/src/social/discovery/.gitkeep
- backend/v1_nestjs/src/social/profiles/.gitkeep
