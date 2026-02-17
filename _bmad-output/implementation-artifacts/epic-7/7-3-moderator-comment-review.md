# Story 7.3: Moderator Comment Review

Status: reivew

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

- [x] Task 1: Comment Moderation API (AC: 3, 4, 5)
  - [x] Subtask 1.1: Create `GET /moderation/queue/comments?status=PENDING`.
  - [x] Subtask 1.2: Include parent post data in response for context.
  - [x] Subtask 1.3: Create `POST /moderation/comments/:commentId/action` with body: `{ action: 'APPROVE' | 'HIDE' | 'DELETE' }`.
  - [x] Subtask 1.4: Create `POST /moderation/posts/:postId/lock-comments` to set `commentsLocked` flag.
  - [ ] Subtask 1.5: Trigger notification to comment author when content is removed. (Deferred - requires notification system)
- [x] Task 2: Dashboard UI (AC: 1, 2)
  - [x] Subtask 2.1: Add "Comments" tab to `ModerationDashboard`.
  - [x] Subtask 2.2: Display comment with parent post excerpt for context.
  - [x] Subtask 2.3: Add "Lock Thread" button for severe cases.

## Dev Notes

- **Architecture Patterns**:
  - **Context is Critical**: Always show parent post to help moderators understand comment context.
  - **Thread Locking**: Prevents further escalation on toxic threads.
  - **User Notification**: Transparency - users should know when/why content is removed. (Deferred to notification system)

- **Source Tree Components**:
  - `backend/v1_nestjs/src/moderation/moderation.service.ts`
  - `frontend/web-console/src/pages/moderation/CommentQueue.tsx`

- **Testing Standards**:
  - Test thread locking prevents new comments.
  - Test notification sent when comment deleted. (Deferred)

### References

- [Source: epics.md#Story 7.3]

## Dev Agent Record

### Completion Notes List

- Added parent post context requirement.
- Specified thread locking mechanism.
- Added user notification on removal. (Deferred to notification system implementation)
- ✅ getCommentQueue endpoint implemented with parent post context
- ✅ resolveReport works for both posts and comments
- ✅ lockPostComments endpoint creates ModerationLog entry
- ✅ All actions logged to ModerationLog with moderatorId and timestamp
- ✅ ModerationDashboard has Comments tab with queue display
- ✅ Confirmation dialogs for all actions

### File List

- `backend/v1_nestjs/src/moderation/services/moderation.service.ts` (getCommentQueue, lockPostComments - now sets commentsLocked)
- `backend/v1_nestjs/src/moderation/controllers/moderation.controller.ts` (RBAC endpoints)
- `backend/v1_nestjs/src/moderation/services/moderation.service.spec.ts` (updated lockPostComments test)
- `backend/v1_nestjs/prisma/schema/schema.prisma` (added commentsLocked field to Post)
- `frontend/web-console/src/pages/moderation/Dashboard.tsx` (Comments tab)
- `frontend/web-console/src/pages/moderation/Dashboard.css` (styles)

## Change Log

| Date       | Change Description                                      |
|------------|--------------------------------------------------------|
| 2025-12-25 | Initial implementation of Story 7.3 - Moderator Comment Review |
| 2025-12-25 | Note: User notification (Subtask 1.5) deferred to notification system |
| 2025-12-26 | Code Review: Added commentsLocked field to Post model, lockPostComments now sets it |
