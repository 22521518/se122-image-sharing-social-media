# Story 6.3: Commenting on Posts

Status: ready-for-dev

## Story

As a **user**,
I want **to comment on a post**,
so that **I can engage in conversation with the author and other users**.

## Acceptance Criteria

1. **Given** I am viewing a post
2. **When** I submit a text comment (max 500 chars)
3. **Then** the comment appears immediately in the list (optimistic UI)
4. **And** the post author receives a notification (unless self-comment)
5. **And** I can delete my own comment with confirmation
6. **And** comments are sorted chronologically (oldest first)

## Tasks / Subtasks

- [ ] Task 1: Backend Comments (AC: 2, 4, 5, 6)
  - [ ] Subtask 1.1: Create `Comment` entity with fields: `postId`, `userId`, `content` (max 500), `createdAt`.
  - [ ] Subtask 1.2: Create `POST /social/comments/:postId` and `DELETE /social/comments/:commentId`.
  - [ ] Subtask 1.3: Add authorization: only comment author can delete.
  - [ ] Subtask 1.4: Trigger notification to post author (unless userId === post.authorId).
  - [ ] Subtask 1.5: Update Post `commentCount` (increment/decrement).
- [ ] Task 2: UI (AC: 1, 3, 5, 6)
  - [ ] Subtask 2.1: Create `CommentList` component with chronological sorting.
  - [ ] Subtask 2.2: Create `CommentInput` component with auto-expanding textarea and character counter.
  - [ ] Subtask 2.3: Implement optimistic UI with rollback on error.
  - [ ] Subtask 2.4: Add delete button (visible only for own comments) with confirmation dialog.

## Dev Notes

- **Architecture Patterns**:
  - **Threading**: Flat list (no nested replies) for MVP simplicity.
  - **Character Limit**: 500 chars balances expression with preventing spam.
  - **Sort Order**: Oldest first (chronological) for conversation flow.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/interactions/comments/comments.service.ts`
  - `frontend/cross-platform/components/social/CommentList.tsx`
  - `frontend/cross-platform/components/social/CommentInput.tsx`

- **Testing Standards**:
  - Test CRUD operations.
  - Test authorization: User A cannot delete User B's comment.
  - Test character limit enforcement.

### References

- [Source: epics.md#Story 6.3]

## Dev Agent Record

### Completion Notes List

- Added 500 char limit.
- Specified chronological sorting (oldest first).
- Added delete confirmation and authorization.

### File List

- `backend/v1_nestjs/src/social/interactions/comments/comments.service.ts`
- `frontend/cross-platform/components/social/CommentList.tsx`
