# Story 0.1: Common Module Setup

Status: review

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

- [x] Initialize `backend/src/common` directory structure
- [x] Create `README.md` with usage guidelines and architecture role
- [x] Create `AGENTS.md` with dependency rules (Common = Leaf Node)
- [x] Implement `GlobalExceptionFilter` (Standard error envelope)
- [x] Implement `ResponseInterceptor` (Standard success envelope)
- [x] Implement `ValidationPipe` (Standard NestJS ValidationPipe enabled globally in main.ts)

## Dev Notes
- **Constraint:** Common module must NOT depend on any feature module.
- **Reference:** `05-IMPLEMENTATION-PATTERNS.md`
- **Location:** `d:\Code\SE122\se122-image-sharing-social-media\_bmad-output\architecture\05-IMPLEMENTATION-PATTERNS.md`

## Dev Agent Record

### Implementation Notes
- Created `CommonModule` in `backend/v1_nestjs/src/common`.
- Implemented `GlobalExceptionFilter` and `ResponseInterceptor` to standardise API responses.
- Registered `CommonModule` in `AppModule`.
- Enabled `ValidationPipe` globally in `main.ts` with whitelist/transform options.
- Added usage documentation in `README.md` and agent rules in `AGENTS.md`.

## File List
- backend/v1_nestjs/src/common/common.module.ts
- backend/v1_nestjs/src/common/filters/global-exception.filter.ts
- backend/v1_nestjs/src/common/interceptors/response.interceptor.ts
- backend/v1_nestjs/src/common/README.md
- backend/v1_nestjs/src/common/AGENTS.md
- backend/v1_nestjs/src/main.ts
- backend/v1_nestjs/src/app.module.ts
