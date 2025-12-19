# Memories Module Agent Rules

## Dependency Rules
1.  **Role**: Core Domain.
2.  **Allowed Imports**:
    - `Auth` (for User ownership)
    - `Media` (for storing content)
    - `Common` (for shared tools/Guards)
3.  **Strict Rule**: Memories represents the **primary business logic**. It integrates other modules to build the complete feature.
4.  **Exports**: Can export `MemoriesService` for other modules (like Feed or Social) to query memory data.

## data Integrity
- All spatial queries **MUST** use PostGIS functions (e.g., `ST_DWithin`, `ST_Distance`).
- Do not store raw lat/long as separate float columns unless strictly necessary for caching; prefer the `Geography` type.
