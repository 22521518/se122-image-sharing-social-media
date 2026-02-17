# Story 5.3: Personalized Following Feed

Status: reivew

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

- [x] Task 1: Feed Query (Backend) (AC: 3, 4)
  - [x] Subtask 1.1: Create `GET /social/feed?cursor=...&limit=20` endpoint.
  - [x] Subtask 1.2: Query: `SELECT posts.* FROM posts JOIN follows ON posts.authorId = follows.followingId WHERE follows.followerId = :userId ORDER BY posts.createdAt DESC`.
  - [x] Subtask 1.3: Add database indexes: `(authorId, createdAt)` and `(followerId, followingId)`.
  - [x] Subtask 1.4: Implement cursor pagination (return `nextCursor` based on last post's createdAt + id).
- [x] Task 2: Feed UI (AC: 1, 2, 5, 6)
  - [x] Subtask 2.1: Updated HomeScreen (`app/(tabs)/index.tsx`) with `FlatList`.
  - [x] Subtask 2.2: PostCard component already has relative timestamps (`formatDate` function with "2h ago" format).
  - [x] Subtask 2.3: Implemented infinite scroll (`onEndReached`) and pull-to-refresh.

## Dev Notes

- **Architecture Patterns**:
  - **Pagination**: Cursor-based (not offset) for consistent results when new posts arrive.
  - **Performance**: CRITICAL - Index `(authorId, createdAt)` to avoid full table scans.
  - **Caching**: Consider Redis for hot feeds (top 100 posts) if needed later.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/feed/feed.service.ts`
  - `frontend/cross-platform/app/(tabs)/index.tsx`
  - `frontend/cross-platform/components/social/PostCard.tsx`

- **Testing Standards**:
  - Integration test: User A follows B → B posts → A sees in feed.
  - Performance test: Query time < 100ms for 1000 follows.

### References

- [Source: epics.md#Story 5.3]

## Dev Agent Record

### Implementation Plan

**Backend Implementation**:
1. Created `FeedModule` with `FeedService`, `FeedController`, `FeedQueryDto`
2. Implemented cursor-based pagination with format `timestamp_postId` for stable ordering
3. Query retrieves posts from followed users + own posts
4. Added composite database index on `(authorId, createdAt)` in Prisma schema
5. Wrote 9 comprehensive unit tests covering all scenarios

**Frontend Implementation**:
1. Added `getFeed` API method to `social.service.ts` with `FeedResponse` interface
2. Updated `SocialContext` with `loadMorePosts`, `hasMore`, `isLoadingMore` for pagination
3. Updated `HomeScreen` with `onEndReached` for infinite scroll and `RefreshControl` for pull-to-refresh
4. Added loading footer indicator for infinite scroll

### Completion Notes List

- ✅ **Task 1.1**: Created `GET /social/feed?cursor=...&limit=20` endpoint
- ✅ **Task 1.2**: Query posts from followed users + own posts using `authorId: { in: [...followingIds, userId] }`
- ✅ **Task 1.3**: Added `@@index([authorId, createdAt])` to Post model in Prisma schema
- ✅ **Task 1.4**: Cursor format: `${createdAt.toISOString()}_${postId}` for stable ordering
- ✅ **Task 2.1**: HomeScreen updated to use FlatList with new feed API
- ✅ **Task 2.2**: PostCard already had relative timestamps (formatDate with "2h ago", "5m ago" format)
- ✅ **Task 2.3**: `onEndReached` for infinite scroll, `RefreshControl` for pull-to-refresh
- ✅ **All 9 backend tests passing**

**AC Validation**:
- AC 3: Posts from followed users + own posts retrieved via indexed query ✅
- AC 4: Sorted by createdAt DESC with cursor-based pagination ✅
- AC 5: Infinite scroll via onEndReached, pull-to-refresh via RefreshControl ✅
- AC 6: PostCard shows text, media, like/comment counts, and "2h ago" timestamps ✅

### File List

**Backend (NEW):**
- `backend/v1_nestjs/src/social/feed/feed.module.ts`
- `backend/v1_nestjs/src/social/feed/feed.service.ts`
- `backend/v1_nestjs/src/social/feed/feed.controller.ts`
- `backend/v1_nestjs/src/social/feed/feed.service.spec.ts`
- `backend/v1_nestjs/src/social/feed/dto/feed-query.dto.ts`

**Backend (Modified):**
- `backend/v1_nestjs/src/social/social.module.ts` (Added FeedModule)
- `backend/v1_nestjs/prisma/schema/schema.prisma` (Added composite index)

**Frontend (Modified):**
- `frontend/cross-platform/services/social.service.ts` (Added getFeed, FeedResponse)
- `frontend/cross-platform/context/SocialContext.tsx` (Added cursor pagination)
- `frontend/cross-platform/app/(tabs)/index.tsx` (Added infinite scroll)

### Change Log

- **2025-12-25**: Completed Story 5.3 - Personalized Following Feed
  - Backend: Created FeedService with cursor pagination, 9 unit tests passing
  - Added composite index on (authorId, createdAt) for performance
  - Frontend: Updated HomeScreen with infinite scroll and pull-to-refresh
  - All 6 acceptance criteria validated and met
- **2025-12-25 [Code Review]**: Fixed MEDIUM severity issues
  - Frontend: Fixed stale cursor by resetting `nextCursorRef` on refresh in `SocialContext.tsx`
  - Frontend: Added `Alert.alert()` for user feedback on API errors in `SocialContext.tsx`
  - Backend: Fixed unused variable warning in `feed.service.spec.ts`

