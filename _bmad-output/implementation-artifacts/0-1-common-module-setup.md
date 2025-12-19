# Story 0.1: Common Module Setup

Status: ready-for-dev

## Story

As a Lead Architect,
I want to initialize the `common` module with shared utilities and base guidelines,
So that other modules can reuse code without duplication or circular dependencies.

## Acceptance Criteria

1. **Given** the backend `src/common` directory
   **When** I initialize the folder structure
   **Then** it must contain `README.md` defining what belongs here (Guards, Interceptors, Filters, Pipes)

2. **And** it must contain `AGENTS.md` with strict rules: "NEVER import from other domain modules; Common is a leaf node in dependency graph."

3. **And** I create the initial `GlobalExceptionFilter` and `ResponseInterceptor` as defined in `05-IMPLEMENTATION-PATTERNS.md`

## Tasks / Subtasks

- [ ] Initialize `backend/src/common` directory structure
- [ ] Create `README.md` with usage guidelines and architecture role
- [ ] Create `AGENTS.md` with dependency rules (Common = Leaf Node)
- [ ] Implement `GlobalExceptionFilter` (Standard error envelope)
- [ ] Implement `ResponseInterceptor` (Standard success envelope)
- [ ] Implement `ValidationPipe` (if custom logic needed, else standard NestJS)

## Dev Notes
- **Constraint:** Common module must NOT depend on any feature module.
- **Reference:** `05-IMPLEMENTATION-PATTERNS.md`
- **Location:** `d:\Code\SE122\se122-image-sharing-social-media\_bmad-output\architecture\05-IMPLEMENTATION-PATTERNS.md`

## File List
- backend/src/common/*
