# Story 7.2: Moderator Post Review

Status: reivew

## Story

As a **moderator**,
I want **to review reported posts**,
so that **I can take action on policy violations**.

## Acceptance Criteria

1. **Given** I am logged in with MODERATOR or ADMIN role
2. **When** I access the moderator dashboard (Web Console only)
3. **Then** I see a queue of PENDING reports sorted by report count (most reported first)
4. **When** I review a reported post, I see the post content, reporter info, and report reason
5. **Then** I can take action: APPROVE (dismiss report), HIDE (soft delete), DELETE (hard delete)
6. **And** the system logs my action with timestamp and moderator ID
7. **And** the report status changes to RESOLVED

## Tasks / Subtasks

- [x] Task 1: Backend Moderation API (AC: 3, 5, 6, 7)
  - [x] Subtask 1.1: Add RBAC guard `@Roles('MODERATOR', 'ADMIN')` to moderation endpoints.
  - [x] Subtask 1.2: Create `GET /moderation/queue/posts?status=PENDING`.
  - [x] Subtask 1.3: Create `POST /moderation/resolve/:reportId` with body: `{ action: 'APPROVE' | 'HIDE' | 'DELETE', notes?: string }`.
  - [x] Subtask 1.4: Create `ModerationLog` entity to track all actions.
  - [x] Subtask 1.5: Update Post status or delete based on action.
- [x] Task 2: Web Console Dashboard (AC: 1, 2, 4)
  - [x] Subtask 2.1: Create `ModerationDashboard.tsx` in `frontend/web-console`.
  - [x] Subtask 2.2: Display queue with post preview, report count, and reporter list.
  - [x] Subtask 2.3: Add action buttons (Approve/Hide/Delete) with confirmation dialogs.

## Dev Notes

- **Architecture Patterns**:
  - **Platform**: STRICTLY Web Console (not mobile).
  - **Audit Trail**: `ModerationLog` records every action for accountability.
  - **Queue Sorting**: Most reported posts first helps prioritize serious violations.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/moderation/moderation.service.ts`
  - `frontend/web-console/src/pages/moderation/Dashboard.tsx`

- **Testing Standards**:
  - Test RBAC: Regular users cannot access moderation endpoints.
  - Test all actions (Approve/Hide/Delete) update post and report status correctly.

### References

- [Source: epics.md#Story 7.2]

## Dev Agent Record

### Completion Notes List

- Specified queue sorting (most reported first).
- Added ModerationLog entity for audit trail.
- Defined action confirmation dialogs.
- ✅ Created RolesGuard and Roles decorator for RBAC
- ✅ Created ModerationLog entity in Prisma with ModerationAction enum
- ✅ Created ModerationService with getPostQueue, getCommentQueue, resolveReport methods
- ✅ Created ModerationController with RBAC-protected endpoints
- ✅ Queue returns reports grouped by content, sorted by report count
- ✅ Actions update report status and log to ModerationLog
- ✅ 11 unit tests for ModerationService all passing
- ✅ Created moderation.service.ts for web console
- ✅ Created ModerationDashboard with tabs, queue display, action buttons, confirmation dialogs
- ✅ Created Dashboard.css with modern styling

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma` (added ModerationLog, ModerationAction)
- `backend/v1_nestjs/src/auth-core/decorators/roles.decorator.ts` (NEW)
- `backend/v1_nestjs/src/auth-core/guards/roles.guard.ts` (NEW)
- `backend/v1_nestjs/src/moderation/dto/resolve-report.dto.ts` (NEW)
- `backend/v1_nestjs/src/moderation/services/moderation.service.ts` (NEW)
- `backend/v1_nestjs/src/moderation/services/moderation.service.spec.ts` (NEW)
- `backend/v1_nestjs/src/moderation/controllers/moderation.controller.ts` (NEW)
- `backend/v1_nestjs/src/moderation/moderation.module.ts` (updated)
- `frontend/web-console/src/services/moderation.service.ts` (NEW)
- `frontend/web-console/src/pages/moderation/Dashboard.tsx` (NEW)
- `frontend/web-console/src/pages/moderation/Dashboard.css` (NEW)

## Change Log

| Date       | Change Description                                      |
|------------|--------------------------------------------------------|
| 2025-12-25 | Initial implementation of Story 7.2 - Moderator Post Review |
| 2025-12-26 | Code Review: Passed all acceptance criteria, tests verified |
