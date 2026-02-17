# Memories Module Agent Rules

## Dependency Rules
1.  **Role**: Core Domain.
2.  **Allowed Imports**:
    - `Auth` (for User ownership)
    - `Media` (for storing content)
    - `Common` (for shared tools/Guards)
    - `Social` (for likes/comments - Story 6.5)
3.  **Strict Rule**: Memories represents the **primary business logic**. It integrates other modules to build the complete feature.
4.  **Exports**: Can export `MemoriesService` for other modules (like Feed or Social) to query memory data.

## Data Integrity
- All spatial queries **MUST** use PostGIS functions (e.g., `ST_DWithin`, `ST_Distance`).
- Do not store raw lat/long as separate float columns unless strictly necessary for caching; prefer the `Geography` type.

## Social Module Integration (Story 6.5)
- Memories support **likes** via `SocialModule > LikesService` using `memoryId` targeting.
- Memories support **comments** via `SocialModule > CommentsService` using `memoryId` targeting.
- API Endpoints:
  - `POST /api/social/likes/memory/toggle/:memoryId` - Toggle like on memory
  - `GET /api/social/likes/memory/status/:memoryId` - Get like status for memory
  - `POST /api/social/comments/memory/:memoryId` - Create comment on memory
  - `GET /api/social/comments/memory/:memoryId` - Get comments for memory
