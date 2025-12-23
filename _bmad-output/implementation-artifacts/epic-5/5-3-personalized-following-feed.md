# Story 5.3: Personalized Following Feed

Status: ready-for-dev

## Story

As a **social user**,
I want **to see a feed of recent posts from people I follow**,
so that **I can stay connected with their lives**.

## Acceptance Criteria

1. **Given** I am on the "Feed" tab
2. **When** the page loads
3. **Then** the system retrieves posts from users I follow (plus my own) using indexed queries
4. **And** they are sorted chronologically (newest first) with cursor-based pagination
5. **And** I can scroll infinitely with pull-to-refresh
6. **And** I see text, media, interaction counts, and "Posted 2h ago" timestamps

## Tasks / Subtasks

- [ ] Task 1: Feed Query (Backend) (AC: 3, 4)
  - [ ] Subtask 1.1: Create `GET /social/feed?cursor=...&limit=20` endpoint.
  - [ ] Subtask 1.2: Query: `SELECT posts.* FROM posts JOIN follows ON posts.authorId = follows.followingId WHERE follows.followerId = :userId ORDER BY posts.createdAt DESC`.
  - [ ] Subtask 1.3: Add database indexes: `(authorId, createdAt)` and `(followerId, followingId)`.
  - [ ] Subtask 1.4: Implement cursor pagination (return `nextCursor` based on last post's createdAt + id).
- [ ] Task 2: Feed UI (AC: 1, 2, 5, 6)
  - [ ] Subtask 2.1: Create `FeedScreen.tsx` with `FlatList`.
  - [ ] Subtask 2.2: Create `PostCard` component with relative timestamps (`moment.js` or `date-fns`).
  - [ ] Subtask 2.3: Implement infinite scroll (`onEndReached`) and pull-to-refresh.

## Dev Notes

- **Architecture Patterns**:
  - **Pagination**: Cursor-based (not offset) for consistent results when new posts arrive.
  - **Performance**: CRITICAL - Index `(authorId, createdAt)` to avoid full table scans.
  - **Caching**: Consider Redis for hot feeds (top 100 posts) if needed later.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/feed/feed.service.ts`
  - `frontend/cross-platform/screens/social/FeedScreen.tsx`
  - `frontend/cross-platform/components/social/PostCard.tsx`

- **Testing Standards**:
  - Integration test: User A follows B → B posts → A sees in feed.
  - Performance test: Query time < 100ms for 1000 follows.

### References

- [Source: epics.md#Story 5.3]

## Dev Agent Record

### Completion Notes List

- Specified cursor-based pagination.
- Added database indexing requirements.
- Defined relative timestamp display.

### File List

- `backend/v1_nestjs/src/social/feed/feed.service.ts`
- `frontend/cross-platform/screens/social/FeedScreen.tsx`
