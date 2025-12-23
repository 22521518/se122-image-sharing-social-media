# Story 8.1: Admin User and Role Management

Status: ready-for-dev

## Story

As a **administrator**,
I want **to manage user accounts and assign roles**,
so that **I can control access and delegate moderation tasks**.

## Acceptance Criteria

1. **Given** I am in the admin console (Web) with ADMIN role
2. **When** I search for a user by username or email
3. **Then** I see their account details (join date, post count, role, status)
4. **When** I click "Lock Account", the user is immediately logged out and cannot log in
5. **When** I assign the MODERATOR role, the user gains access to moderation dashboard
6. **And** all role changes are logged in AuditLog
7. **And** I cannot demote my own admin role (safety check)

## Tasks / Subtasks

- [ ] Task 1: Admin API (Backend) (AC: 4, 5, 6, 7)
  - [ ] Subtask 1.1: Create `PUT /admin/users/:userId/roles` with body: `{ roles: ['USER', 'MODERATOR'] }`.
  - [ ] Subtask 1.2: Add validation: Cannot remove ADMIN from self.
  - [ ] Subtask 1.3: Create `PUT /admin/users/:userId/lock` to set `isLocked` flag.
  - [ ] Subtask 1.4: Implement token invalidation: increment `tokenVersion` on user lock.
  - [ ] Subtask 1.5: Create `AuditLog` entity to track admin actions.
- [ ] Task 2: Admin UI (AC: 1, 2, 3)
  - [ ] Subtask 2.1: Create `UserManagement.tsx` in web-console with search bar.
  - [ ] Subtask 2.2: Display user table with key stats.
  - [ ] Subtask 2.3: Add role editor (multi-select) and lock/unlock toggle.

## Dev Notes

- **Architecture Patterns**:
  - **Token Invalidation**: Use `tokenVersion` field. JWT middleware checks `user.tokenVersion === token.version`.
  - **Self-Protection**: Prevent admins from accidentally locking themselves out.
  - **Audit Trail**: Every admin action logged for compliance.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/admin/users/admin-users.service.ts`
  - `frontend/web-console/src/pages/admin/UserManagement.tsx`

- **Testing Standards**:
  - Test self-demotion prevention.
  - Test token invalidation on lock.

### References

- [Source: epics.md#Story 8.1]

## Dev Agent Record

### Completion Notes List

- Added token invalidation mechanism.
- Specified self-protection validation.
- Added AuditLog entity.

### File List

- `backend/v1_nestjs/src/admin/users/admin-users.service.ts`
- `frontend/web-console/src/pages/admin/UserManagement.tsx`
