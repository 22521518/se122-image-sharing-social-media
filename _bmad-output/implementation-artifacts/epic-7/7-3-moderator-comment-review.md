# Story 7.3: Moderator Comment Review

Status: ready-for-dev

## Story

As a **moderator**,
I want **to moderate comments**,
so that **I can maintain a healthy discussion environment**.

## Acceptance Criteria

1. **Given** I am reviewing reported comments in the moderation dashboard
2. **When** I view a reported comment, I see the comment text, parent post context, and reporter info
3. **Then** I can take action: APPROVE, HIDE, DELETE, or LOCK_THREAD (prevents new comments on post)
4. **And** the user is notified if their content is removed
5. **And** my action is logged in ModerationLog

## Tasks / Subtasks

- [ ] Task 1: Comment Moderation API (AC: 3, 4, 5)
  - [ ] Subtask 1.1: Create `GET /moderation/queue/comments?status=PENDING`.
  - [ ] Subtask 1.2: Include parent post data in response for context.
  - [ ] Subtask 1.3: Create `POST /moderation/comments/:commentId/action` with body: `{ action: 'APPROVE' | 'HIDE' | 'DELETE' }`.
  - [ ] Subtask 1.4: Create `POST /moderation/posts/:postId/lock-comments` to set `commentsLocked` flag.
  - [ ] Subtask 1.5: Trigger notification to comment author when content is removed.
- [ ] Task 2: Dashboard UI (AC: 1, 2)
  - [ ] Subtask 2.1: Add "Comments" tab to `ModerationDashboard`.
  - [ ] Subtask 2.2: Display comment with parent post excerpt for context.
  - [ ] Subtask 2.3: Add "Lock Thread" button for severe cases.

## Dev Notes

- **Architecture Patterns**:
  - **Context is Critical**: Always show parent post to help moderators understand comment context.
  - **Thread Locking**: Prevents further escalation on toxic threads.
  - **User Notification**: Transparency - users should know when/why content is removed.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/moderation/moderation.service.ts`
  - `frontend/web-console/src/pages/moderation/CommentQueue.tsx`

- **Testing Standards**:
  - Test thread locking prevents new comments.
  - Test notification sent when comment deleted.

### References

- [Source: epics.md#Story 7.3]

## Dev Agent Record

### Completion Notes List

- Added parent post context requirement.
- Specified thread locking mechanism.
- Added user notification on removal.

### File List

- `backend/v1_nestjs/src/moderation/moderation.service.ts`
- `frontend/web-console/src/pages/moderation/CommentQueue.tsx`
