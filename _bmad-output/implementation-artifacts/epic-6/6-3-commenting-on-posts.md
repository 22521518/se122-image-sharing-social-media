# Story 6.3: Commenting on Posts

Status: review

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

- [x] Task 1: Backend Comments (AC: 2, 4, 5, 6)
  - [x] Subtask 1.1: Create `Comment` entity with fields: `postId`, `userId`, `content` (max 500), `createdAt`.
  - [x] Subtask 1.2: Create `POST /social/comments/:postId` and `DELETE /social/comments/:commentId`.
  - [x] Subtask 1.3: Add authorization: only comment author can delete.
  - [x] Subtask 1.4: Trigger notification to post author (unless userId === post.authorId).
    - Implemented: NotificationsService injected; COMMENT notification sent on comment creation (unless self-comment)
  - [x] Subtask 1.5: Update Post `commentCount` (increment/decrement).
- [x] Task 2: UI (AC: 1, 3, 5, 6)
  - [x] Subtask 2.1: Create `CommentList` component with chronological sorting.
  - [x] Subtask 2.2: Create `CommentInput` component with auto-expanding textarea and character counter.
  - [x] Subtask 2.3: Implement optimistic UI with rollback on error.
  - [x] Subtask 2.4: Add delete button (visible only for own comments) with confirmation dialog.

## Dev Notes

- **Architecture Patterns**:
  - **Threading**: Flat list (no nested replies) for MVP simplicity.
  - **Character Limit**: 500 chars balances expression with preventing spam.
  - **Sort Order**: Oldest first (chronological) for conversation flow.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/comments/comments.service.ts`
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

- Comment entity created in schema during Story 6.2 prep.
- Implemented CommentsService with create/delete/getAll operations.
- Authorization enforced: ForbiddenException if deleting others' comments.
- 15 backend unit tests passing (service and controller).
- Created CommentInput with 500 char limit and live counter.
- Created CommentList with chronological sorting, delete button, and confirmation dialog.
- Optimistic UI with rollback on error for both create and delete.
- Added comment methods to frontend social.service.ts.

> [!NOTE]
> **Subtask 1.4 (Notifications)**: ✅ Implemented 2025-12-27. CommentsModule imports NotificationsModule, CommentsService triggers COMMENT notification when creating comment and userId !== owner.

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma` (Comment model from 6.2)
- `backend/v1_nestjs/src/social/comments/comments.service.ts`
- `backend/v1_nestjs/src/social/comments/comments.controller.ts`
- `backend/v1_nestjs/src/social/comments/comments.module.ts`
- `backend/v1_nestjs/src/social/comments/dto/create-comment.dto.ts`
- `backend/v1_nestjs/src/social/comments/comments.service.spec.ts`
- `backend/v1_nestjs/src/social/comments/comments.controller.spec.ts`
- `backend/v1_nestjs/src/social/social.module.ts`
- `frontend/cross-platform/components/social/CommentInput.tsx`
- `frontend/cross-platform/components/social/CommentList.tsx`
- `frontend/cross-platform/services/social.service.ts`

### Change Log

- 2025-12-23: Story 6.3 implemented - comment CRUD endpoints, CommentInput and CommentList UI
- 2025-12-24: Code review completed
- 2025-12-27: Implemented Subtask 1.4 (comment notification trigger) - now that notification infrastructure is complete

---

## Senior Developer Review (AI)

**Reviewed:** 2025-12-24  
**Issues Found:** 0 HIGH, 2 MEDIUM, 1 LOW  
**Status:** ✅ All issues documented

### Findings

1. **[MEDIUM] AC #4 Notifications deferred** — Subtask 1.4 explicitly marked incomplete. Architecture supports it (returns `post.authorId`). **Documented, not blocking.**

2. **[MEDIUM] Missing frontend tests** — `CommentList` and `CommentInput` have no unit tests. Consider adding for optimistic UI and error handling.

3. **[LOW] Redundant currentUserId** — `CommentList` accepts `currentUserId` prop but backend returns `isOwner` boolean, making client-side matching redundant. Minor cleanup opportunity.

### Resolved Items (2025-12-27)
- ✅ **[MEDIUM] AC #4 Notifications** — Subtask 1.4 now implemented. Notifications sent when commenting on posts/memories (unless self-comment).
