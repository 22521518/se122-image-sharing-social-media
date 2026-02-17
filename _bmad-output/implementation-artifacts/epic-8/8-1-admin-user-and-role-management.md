# Story 8.1: Admin User and Role Management

Status: reivew

## Story

As a **administrator**,
I want **to manage user accounts and assign roles**,
so that **I can control access and delegate moderation tasks**.

## Acceptance Criteria

1. **Given** I am in the admin console (Web) with ADMIN role ✅
2. **When** I search for a user by username or email ✅
3. **Then** I see their account details (join date, post count, role, status) ✅
4. **When** I click "Lock Account", the user is immediately logged out and cannot log in ✅
5. **When** I assign the MODERATOR role, the user gains access to moderation dashboard ✅
6. **And** all role changes are logged in AuditLog ✅
7. **And** I cannot demote my own admin role (safety check) ✅

## Tasks / Subtasks

- [x] Task 1: Admin API (Backend) (AC: 4, 5, 6, 7)
  - [x] Subtask 1.1: Create `PUT /admin/users/:userId/roles` with body: `{ roles: ['USER', 'MODERATOR'] }`.
  - [x] Subtask 1.2: Add validation: Cannot remove ADMIN from self.
  - [x] Subtask 1.3: Create `PUT /admin/users/:userId/lock` to set `isLocked` flag.
  - [x] Subtask 1.4: Implement token invalidation: increment `tokenVersion` on user lock.
  - [x] Subtask 1.5: Create `AuditLog` entity to track admin actions.
- [x] Task 2: Admin UI (AC: 1, 2, 3)
  - [x] Subtask 2.1: Create `UserManagement.tsx` in web-console with search bar.
  - [x] Subtask 2.2: Display user table with key stats.
  - [x] Subtask 2.3: Add role editor (multi-select) and lock/unlock toggle.

## Dev Notes

- **Architecture Patterns**:
  - **Token Invalidation**: Use `tokenVersion` field. JWT middleware checks `user.tokenVersion === token.version`.
  - **Self-Protection**: Prevent admins from accidentally locking themselves out.
  - **Audit Trail**: Every admin action logged for compliance.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/admin/services/admin-users.service.ts`
  - `frontend/web-console/src/pages/admin/UserManagement.tsx`

- **Testing Standards**:
  - Test self-demotion prevention.
  - Test token invalidation on lock.

### References

- [Source: epics.md#Story 8.1]

## Dev Agent Record

### Completion Notes List

- Added `isLocked` and `tokenVersion` fields to User model in Prisma schema
- Created `AuditLog` entity with `AdminAction` enum (ROLE_CHANGE, ACCOUNT_LOCK, ACCOUNT_UNLOCK)
- Implemented token invalidation in `AuthCoreService.validateUser()` - checks `isLocked` and `tokenVersion` mismatch
- Created `AdminUsersService` with searchUsers, getUserDetails, updateRoles, setAccountLock methods
- Created `AdminUsersController` with ADMIN role-protected endpoints
- Created `admin.service.ts` in web-console for API calls
- Created `UserManagement.tsx` with search bar, user table, role dropdown editor, lock/unlock toggle
- Integrated UserManagement into App.tsx with admin navigation tabs

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma` - Added isLocked, tokenVersion, AuditLog
- `backend/v1_nestjs/src/auth-core/auth-core.service.ts` - Token invalidation logic
- `backend/v1_nestjs/src/admin/admin.module.ts` - Registered new components
- `backend/v1_nestjs/src/admin/dto/update-roles.dto.ts` - NEW
- `backend/v1_nestjs/src/admin/dto/lock-account.dto.ts` - NEW
- `backend/v1_nestjs/src/admin/dto/index.ts` - NEW
- `backend/v1_nestjs/src/admin/services/admin-users.service.ts` - NEW
- `backend/v1_nestjs/src/admin/services/index.ts` - NEW
- `backend/v1_nestjs/src/admin/controllers/admin-users.controller.ts` - NEW
- `backend/v1_nestjs/src/admin/controllers/index.ts` - NEW
- `backend/v1_nestjs/src/users/users.service.spec.ts` - Updated mock
- `frontend/web-console/src/services/api.service.ts` - Added PUT method
- `frontend/web-console/src/services/admin.service.ts` - NEW
- `frontend/web-console/src/pages/admin/UserManagement.tsx` - NEW
- `frontend/web-console/src/pages/admin/UserManagement.css` - NEW
- `frontend/web-console/src/App.tsx` - Added admin navigation
- `frontend/web-console/src/App.css` - Added admin nav styles
- `backend/v1_nestjs/src/admin/services/admin-users.service.spec.ts` - NEW (Code Review)

## Change Log

- 2025-12-27: Implemented all tasks for Story 8.1
- 2025-12-27: **Code Review Fixes Applied**:
  - Created unit tests for AdminUsersService (15 tests covering AC 4,6,7)
  - Fixed route order bug in controller (audit-log was unreachable)
  - Fixed moderator access to moderation dashboard (AC 5)
  - Added confirmation dialogs for lock/role actions
  - Added logout button to AdminWrapper navigation
