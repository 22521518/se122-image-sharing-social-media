# Story 7.1: Reporting Violations

Status: ready-for-dev

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

- [ ] Task 1: Backend Reporting (AC: 3, 6)
  - [ ] Subtask 1.1: Create `Report` entity with fields: `reporterId`, `targetType`, `targetId`, `reason`, `description`, `status`.
  - [ ] Subtask 1.2: Add unique constraint `(reporterId, targetType, targetId)` to prevent duplicate reports.
  - [ ] Subtask 1.3: Create `POST /moderation/reports` endpoint.
  - [ ] Subtask 1.4: Validate reason is from enum: `SPAM | HARASSMENT | INAPPROPRIATE | OTHER`.
- [ ] Task 2: UI (AC: 1, 2, 4, 5)
  - [ ] Subtask 2.1: Create `ReportModal` with reason selector and optional description field.
  - [ ] Subtask 2.2: Add "Block User" checkbox.
  - [ ] Subtask 2.3: Show success toast on submission.
  - [ ] Subtask 2.4: Integrate into Post/Comment/Profile menus.

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

### File List

- `backend/v1_nestjs/src/moderation/reports/reports.service.ts`
- `frontend/cross-platform/components/moderation/ReportModal.tsx`
