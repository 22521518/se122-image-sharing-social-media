# Story 6.1: Following and Unfollowing Users

Status: ready-for-dev

## Story

As a **user**,
I want **to follow other users**,
so that **I can see their updates in my feed**.

## Acceptance Criteria

1. **Given** I am on another user's profile
2. **When** I click the "Follow" button
3. **Then** the system creates a `Follow` relationship (with optimistic UI update)
4. **And** the button state changes to "Following" immediately
5. **And** follower/following counts update for both users
6. **And** their future posts appear in my feed
7. **When** I click "Following" (Unfollow), the relationship is removed with confirmation dialog

## Tasks / Subtasks

- [ ] Task 1: Backend Follow Logic (AC: 3, 5, 6, 7)
  - [ ] Subtask 1.1: Create `Follow` entity with unique constraint `(followerId, followingId)`.
  - [ ] Subtask 1.2: Create `POST /social/graph/follow/:userId` (idempotent) and `DELETE /social/graph/unfollow/:userId`.
  - [ ] Subtask 1.3: Prevent self-follow with validation.
  - [ ] Subtask 1.4: Update User `followerCount` and `followingCount` (use database triggers or transactional update).
- [ ] Task 2: UI (AC: 1, 2, 4, 7)
  - [ ] Subtask 2.1: Create `FollowButton` component with optimistic state.
  - [ ] Subtask 2.2: Add confirmation dialog for unfollow.
  - [ ] Subtask 2.3: Integrate into `ProfileScreen`.

## Dev Notes

- **Architecture Patterns**:
  - **Data Integrity**: Unique constraint on `(followerId, followingId)` prevents duplicate follows.
  - **Optimistic UI**: Update button immediately, rollback on error.
  - **Counts**: Use database triggers or increment/decrement in transaction to keep counts accurate.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/graph/graph.service.ts`
  - `frontend/cross-platform/components/social/FollowButton.tsx`

- **Testing Standards**:
  - Test self-follow prevention.
  - Test duplicate follow (should be idempotent).
  - Integration test: Follow → Verify feed updates.

### References

- [Source: epics.md#Story 6.1]

## Dev Agent Record

### Completion Notes List

- Added optimistic UI requirement.
- Specified unique constraint and self-follow prevention.
- Added unfollow confirmation dialog.

### File List

- `backend/v1_nestjs/src/social/graph/graph.service.ts`
- `frontend/cross-platform/components/social/FollowButton.tsx`
