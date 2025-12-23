# Story 5.4: Explore and Search

Status: ready-for-dev

## Story

As a **curious user**,
I want **to discover new content and search for specific hashtags or people**,
so that **I can expand my network**.

## Acceptance Criteria

1. **Given** I am on the "Explore" tab
2. **When** I view the default state
3. **Then** I see trending public posts (most liked in last 24h, max 50 results, refreshed hourly)
4. **When** I search for a query (min 2 chars)
5. **Then** the system returns matching **Hashtags** (exact + prefix), **Users** (username/displayName), and **Posts** (content text)
6. **And** results are filtered to PUBLIC content only
7. **And** I can click results to navigate to Profile, Hashtag Feed, or Post detail

## Tasks / Subtasks

- [ ] Task 1: Search API (AC: 4, 5, 6)
  - [ ] Subtask 1.1: Create `GET /social/search?q=...&type=all|users|posts|hashtags`.
  - [ ] Subtask 1.2: Implement queries: Users (`ILIKE '%query%'` on username/displayName), Posts (full-text search or `ILIKE`), Hashtags (exact match + prefix).
  - [ ] Subtask 1.3: STRICTLY filter `privacy = 'PUBLIC'` for posts.
  - [ ] Subtask 1.4: Return structured: `{ users: [], posts: [], hashtags: [] }`.
- [ ] Task 2: Trending/Explore API (AC: 2, 3)
  - [ ] Subtask 2.1: Create `GET /social/explore/trending`.
  - [ ] Subtask 2.2: Query: `SELECT * FROM posts WHERE privacy = 'PUBLIC' AND createdAt > NOW() - INTERVAL '24 hours' ORDER BY likeCount DESC LIMIT 50`.
  - [ ] Subtask 2.3: Cache results for 1 hour (Redis or in-memory).
- [ ] Task 3: Explore UI (AC: 1, 7)
  - [ ] Subtask 3.1: Create `ExploreScreen.tsx` with search bar and tabs (Top/Accounts/Tags/Posts).
  - [ ] Subtask 3.2: Implement debounced search (300ms delay).
  - [ ] Subtask 3.3: Grid layout for trending posts.

## Dev Notes

- **Architecture Patterns**:
  - **Search Performance**: For better performance, consider Postgres full-text search (`tsvector`) or Elasticsearch for large scale.
  - **Privacy**: CRITICAL - Never leak private content in search/explore.
  - **Trending Cache**: Hourly refresh prevents expensive queries on every page load.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/discovery/discovery.service.ts`
  - `frontend/cross-platform/screens/social/ExploreScreen.tsx`

- **Testing Standards**:
  - Security test: Private posts NEVER appear in search results.
  - Performance test: Search response < 200ms.

### References

- [Source: epics.md#Story 5.4]

## Dev Agent Record

### Completion Notes List

- Defined trending algorithm (24h, most liked).
- Added search debouncing and min length.
- Specified caching strategy.
- Emphasized privacy filtering.

### File List

- `backend/v1_nestjs/src/social/discovery/discovery.service.ts`
- `frontend/cross-platform/screens/social/ExploreScreen.tsx`
