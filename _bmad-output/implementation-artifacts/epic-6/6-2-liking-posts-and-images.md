# Story 6.2: Liking Posts and Images

Status: ready-for-dev

## Story

As a **user**,
I want **to like a post or image**,
so that **I can show appreciation for the content**.

## Acceptance Criteria

1. **Given** I am viewing a post
2. **When** I click the "Like" button
3. **Then** the like count increases immediately (optimistic UI) with heart animation
4. **And** the server records the Like with unique constraint `(userId, postId)`
5. **And** the author receives a notification (unless self-like)
6. **And** I can unlike by clicking again (toggle behavior)

## Tasks / Subtasks

- [ ] Task 1: Backend Likes (AC: 4, 5, 6)
  - [ ] Subtask 1.1: Create `Like` entity with unique constraint `(userId, postId)`.
  - [ ] Subtask 1.2: Create `POST /social/likes/toggle/:postId` (toggle endpoint - creates if not exists, deletes if exists).
  - [ ] Subtask 1.3: Update Post `likeCount` (increment/decrement in transaction).
  - [ ] Subtask 1.4: Trigger notification if creating like and userId !== post.authorId.
- [ ] Task 2: UI (AC: 1, 2, 3, 6)
  - [ ] Subtask 2.1: Create `LikeButton` component with heart animation (`react-native-reanimated`).
  - [ ] Subtask 2.2: Implement optimistic state update with rollback on error.

## Dev Notes

- **Architecture Patterns**:
  - **Toggle Endpoint**: Single endpoint handles both like/unlike for simplicity.
  - **Unique Constraint**: Prevents duplicate likes.
  - **Performance**: `likeCount` denormalized on Post for fast reads. Update in transaction.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/interactions/likes/likes.service.ts`
  - `frontend/cross-platform/components/social/LikeButton.tsx`

- **Testing Standards**:
  - Test toggle behavior (like → unlike → like).
  - Test duplicate prevention.
  - Test notification NOT sent for self-like.

### References

- [Source: epics.md#Story 6.2]

## Dev Agent Record

### Completion Notes List

- Specified toggle endpoint pattern.
- Added heart animation requirement.
- Defined unique constraint and count management.

### File List

- `backend/v1_nestjs/src/social/interactions/likes/likes.service.ts`
- `frontend/cross-platform/components/social/LikeButton.tsx`
