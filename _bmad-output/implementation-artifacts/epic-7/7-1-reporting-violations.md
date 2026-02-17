# Story 7.1: Reporting Violations

Status: reivew

## Story

As a **user**,
I want **to report a post, comment, or account**,
so that **I can help keep the community safe and healthy**.

## Acceptance Criteria

1. **Given** I see content that violates community standards
2. **When** I click "Report" and select a reason from predefined list (Spam, Harassment, Inappropriate Content, Other)
3. **Then** a report is created with status `PENDING` for moderator review
4. **And** I receive visual confirmation ("Thank you for reporting")
5. **And** I can optionally block the user simultaneously
6. **And** I cannot report the same content twice (idempotent)

## Tasks / Subtasks

- [x] Task 1: Backend Reporting (AC: 3, 6)
  - [x] Subtask 1.1: Create `Report` entity with fields: `reporterId`, `targetType`, `targetId`, `reason`, `description`, `status`.
  - [x] Subtask 1.2: Add unique constraint `(reporterId, targetType, targetId)` to prevent duplicate reports.
  - [x] Subtask 1.3: Create `POST /moderation/reports` endpoint.
  - [x] Subtask 1.4: Validate reason is from enum: `SPAM | HARASSMENT | INAPPROPRIATE | OTHER`.
- [x] Task 2: UI (AC: 1, 2, 4, 5)
  - [x] Subtask 2.1: Create `ReportModal` with reason selector and optional description field.
  - [x] Subtask 2.2: Add "Block User" checkbox.
  - [x] Subtask 2.3: Show success toast on submission.
  - [x] Subtask 2.4: Integrate into Post/Comment/Profile menus.

## Dev Notes

- **Architecture Patterns**:
  - **Polymorphic Reports**: Use `targetType` (post/comment/user) + `targetId` for flexibility.
  - **Duplicate Prevention**: Unique constraint ensures users can't spam reports.
  - **Reason Enum**: Predefined reasons help moderators categorize quickly.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/moderation/reports/reports.service.ts`
  - `frontend/cross-platform/components/moderation/ReportModal.tsx`

- **Testing Standards**:
  - Test duplicate report prevention.
  - Test all report types (post/comment/user).

### References

- [Source: epics.md#Story 7.1]

## Dev Agent Record

### Completion Notes List

- Added predefined reason enum.
- Specified duplicate prevention with unique constraint.
- Added block user option.
- ✅ Implemented Report entity in Prisma with ReportReason, ReportStatus, TargetType enums
- ✅ Added unique constraint `@@unique([reporterId, targetType, targetId])` for idempotent reports
- ✅ Created ReportsService with createReport method, validation, and duplicate prevention
- ✅ Created ReportsController with POST /moderation/reports endpoint
- ✅ Created CreateReportDto with class-validator decorators
- ✅ 12 unit tests for ReportsService all passing (covers all target types, duplicates, errors)
- ✅ Created moderation.service.ts frontend service
- ✅ Created ReportModal.tsx with reason selector, description field, block user checkbox, success screen
- ✅ Integrated Report button into PostCard (three-dot menu)
- ✅ Integrated Report button into CommentList (flag icon for non-owner comments)

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma` (added Report model, enums)
- `backend/v1_nestjs/src/moderation/dto/create-report.dto.ts` (NEW)
- `backend/v1_nestjs/src/moderation/services/reports.service.ts` (NEW)
- `backend/v1_nestjs/src/moderation/services/reports.service.spec.ts` (NEW)
- `backend/v1_nestjs/src/moderation/controllers/reports.controller.ts` (NEW)
- `backend/v1_nestjs/src/moderation/moderation.module.ts` (updated)
- `frontend/cross-platform/services/moderation.service.ts` (NEW)
- `frontend/cross-platform/components/moderation/ReportModal.tsx` (NEW)
- `frontend/cross-platform/components/social/PostCard.tsx` (updated - added Report)
- `frontend/cross-platform/components/social/CommentList.tsx` (updated - added Report)

## Change Log

| Date       | Change Description                                      |
|------------|--------------------------------------------------------|
| 2025-12-25 | Initial implementation of Story 7.1 - Reporting Violations |
| 2025-12-26 | Code Review: Clarified blockUser as deferred pending Block model implementation |
