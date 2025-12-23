# Story 8.3: Admin Report and Complaint Management

Status: ready-for-dev

## Story

As a **administrator**,
I want **to manage high-level reports and complaints**,
so that **I can resolve complex disputes or appeals**.

## Acceptance Criteria

1. **Given** I am reviewing the admin reports queue
2. **When** I click on a report, I see full history: reporter, target, all moderator actions, timestamps
3. **Then** I can override moderator decisions or escalate to ban
4. **When** I issue a final ruling (Ban/Warning/Dismiss), the user receives a system notification
5. **And** bans prevent user login and hide all their content
6. **And** all admin actions are logged in AuditLog

## Tasks / Subtasks

- [ ] Task 1: Admin Reports API (AC: 2, 3, 5, 6)
  - [ ] Subtask 1.1: Create `GET /admin/reports?status=ALL` (includes PENDING and RESOLVED).
  - [ ] Subtask 1.2: Include full moderation history in response.
  - [ ] Subtask 1.3: Create `POST /admin/users/:userId/ban` with body: `{ reason: string, duration?: number }`.
  - [ ] Subtask 1.4: Set `isBanned` flag and `bannedUntil` date on user.
  - [ ] Subtask 1.5: Create `POST /admin/users/:userId/warn` to send warning notification.
- [ ] Task 2: Ban Enforcement (AC: 5)
  - [ ] Subtask 2.1: Update auth middleware to check `isBanned` and `bannedUntil`.
  - [ ] Subtask 2.2: Hide banned user's posts/comments from public feeds (soft delete or filter).
- [ ] Task 3: Admin UI (AC: 1, 4)
  - [ ] Subtask 3.1: Create `AdminReports.tsx` with full report history view.
  - [ ] Subtask 3.2: Add Ban/Warn/Dismiss action buttons with confirmation dialogs.

## Dev Notes

- **Architecture Patterns**:
  - **Ban Types**: Permanent (`bannedUntil = NULL`) or temporary (`bannedUntil = future date`).
  - **Content Hiding**: Soft delete (set `isHidden` flag) rather than hard delete for audit trail.
  - **Escalation**: Admins can override any moderator decision.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/admin/reports/admin-reports.service.ts`
  - `frontend/web-console/src/pages/admin/AdminReports.tsx`

- **Testing Standards**:
  - Test ban prevents login.
  - Test temporary ban expires correctly.
  - Test banned user content is hidden.

### References

- [Source: epics.md#Story 8.3]

## Dev Agent Record

### Completion Notes List

- Defined ban types (permanent/temporary).
- Specified content hiding mechanism.
- Added warning notification system.

### File List

- `backend/v1_nestjs/src/admin/reports/admin-reports.service.ts`
- `frontend/web-console/src/pages/admin/AdminReports.tsx`
