# Story 0.6: Social Module Setup

Status: ready-for-dev

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

- [ ] Initialize `backend/src/social` directory structure
- [ ] Create Subdirectories: `feed/`, `posts/`, `discovery/`, `profiles/`
- [ ] Create `README.md` documenting the subdomain strategy
- [ ] Create `AGENTS.md` with dependency rules (No Monolithic Service)

## Dev Notes
- **Structural Decision:** Decision 2 in `06-PROJECT-STRUCTURE.md` - Subdivided subdomains.
- Note: Profile management (UC3) straddles Auth and Social. Profile data usually in Social, Auth data (creds) in Auth.

## File List
- backend/src/social/*
