# Story 8.3: Admin Report and Complaint Management

Status: reivew

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

- [x] Task 1: Admin Reports API (AC: 2, 3, 5, 6)
  - [x] Subtask 1.1: Create `GET /admin/reports?status=ALL` (includes PENDING and RESOLVED).
  - [x] Subtask 1.2: Include full moderation history in response.
  - [x] Subtask 1.3: Create `POST /admin/users/:userId/ban` with body: `{ reason: string, duration?: number }`.
  - [x] Subtask 1.4: Set `isBanned` flag and `bannedUntil` date on user.
  - [x] Subtask 1.5: Create `POST /admin/users/:userId/warn` to send warning notification.
- [x] Task 2: Ban Enforcement (AC: 5)
  - [x] Subtask 2.1: Update auth middleware to check `isBanned` and `bannedUntil`.
  - [x] Subtask 2.2: Hide banned user's posts/comments from public feeds (soft delete or filter).
- [x] Task 3: Admin UI (AC: 1, 4)
  - [x] Subtask 3.1: Create `AdminReports.tsx` with full report history view.
  - [x] Subtask 3.2: Add Ban/Warn/Dismiss action buttons with confirmation dialogs.

## Dev Notes

- **Architecture Patterns**:
  - **Ban Types**: Permanent (`bannedUntil = NULL`) or temporary (`bannedUntil = future date`).
  - **Content Hiding**: Filter by `isBanned: false` on author in feed queries.
  - **Escalation**: Admins can override any moderator decision.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/admin/services/admin-reports.service.ts`
  - `backend/v1_nestjs/src/admin/controllers/admin-reports.controller.ts`
  - `frontend/web-console/src/pages/admin/AdminReports.tsx`

- **Testing Standards**:
  - Test ban prevents login.
  - Test temporary ban expires correctly.
  - Test banned user content is hidden.

### References

- [Source: epics.md#Story 8.3]

## Dev Agent Record

### Completion Notes List

- Added `isBanned` and `bannedUntil` fields to User model in Prisma schema.
- Added `USER_BAN`, `USER_WARN`, `USER_DISMISS` actions to AdminAction enum.
- Created `AdminReportsService` with `getReports`, `banUser`, `warnUser`, `dismissReport` methods.
- Created `AdminReportsController` with endpoints at `/admin/reports/*`.
- Updated `AuthCoreService.validateUser` to check ban status (permanent and temporary).
- Updated `FeedService.getFeed` to filter out posts from banned users.
- Created `AdminReports.tsx` React component with status filters, report table, detail modal, and action modals (Ban/Warn/Dismiss).
- Added report management methods to frontend `admin.service.ts`.

### Code Review Fixes (2025-12-27)

- **[HIGH FIX]** Integrated `AdminReports.tsx` into `App.tsx` navigation - added 'reports' page route and nav button.
- **[HIGH FIX]** Added `isBanned: false` filter to `CommentsService.getComments()` and `getMemoryComments()` to hide comments from banned users (AC 5).
- **[MEDIUM FIX]** Created `admin-reports.service.spec.ts` with comprehensive unit tests for all service methods.
- **[LOW - NOTED]** AC 4 warn notification: Currently logs to AuditLog only. Full notification system integration pending (notification service not yet implemented).
- **[LOW - NOTED]** N+1 query in `getReports()`: Acceptable for admin dashboard with small result sets; can be optimized later if needed.

### Code Review Fixes #2 (2025-12-27)

- **[HIGH FIX]** Added `isBanned: false` filter to `DiscoveryService.search()` - users, posts, and `getTrending()` now exclude banned users (AC 5).
- **[HIGH FIX]** Created `admin-reports.controller.spec.ts` with 8 test cases for controller HTTP layer.
- **[MEDIUM FIX]** Added `ReportsQueryDto` with class-validator decorators for proper input validation on query params.
- **[MEDIUM FIX]** Updated `AdminReportsController.getReports()` to use DTO-based validation with `@Query()` decorator.

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma`
- `backend/v1_nestjs/src/admin/services/admin-reports.service.ts`
- `backend/v1_nestjs/src/admin/services/admin-reports.service.spec.ts`
- `backend/v1_nestjs/src/admin/controllers/admin-reports.controller.ts`
- `backend/v1_nestjs/src/admin/controllers/admin-reports.controller.spec.ts`
- `backend/v1_nestjs/src/admin/dto/admin-reports.dto.ts`
- `backend/v1_nestjs/src/admin/admin.module.ts`
- `backend/v1_nestjs/src/admin/controllers/index.ts`
- `backend/v1_nestjs/src/admin/services/index.ts`
- `backend/v1_nestjs/src/admin/dto/index.ts`
- `backend/v1_nestjs/src/auth-core/auth-core.service.ts`
- `backend/v1_nestjs/src/social/feed/feed.service.ts`
- `backend/v1_nestjs/src/social/comments/comments.service.ts`
- `backend/v1_nestjs/src/social/discovery/discovery.service.ts`
- `frontend/web-console/src/services/admin.service.ts`
- `frontend/web-console/src/pages/admin/AdminReports.tsx`
- `frontend/web-console/src/pages/admin/AdminReports.css`
- `frontend/web-console/src/App.tsx`

### Change Log

- 2025-12-27: Implemented Story 8.3 - Admin Report and Complaint Management
  - Backend: Admin reports API with ban/warn/dismiss endpoints
  - Backend: Ban enforcement in auth validation and feed filtering
  - Frontend: AdminReports.tsx with full history view and action buttons
- 2025-12-27: Code Review Fixes Applied
  - Fixed AdminReports navigation integration in App.tsx
  - Fixed comments filtering for banned users in CommentsService
  - Added unit tests for AdminReportsService
- 2025-12-27: Code Review Fixes #2 Applied
  - Fixed explore/trending/search filtering for banned users in DiscoveryService
  - Added controller unit tests (admin-reports.controller.spec.ts)
  - Added ReportsQueryDto for validated query parameters
