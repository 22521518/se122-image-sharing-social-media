# Story 2.4a: Map Viewport Logic

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user exploring my history,
I want to see my memories as pins on a map that update as I move,
so that I can find memories relevant to where I am looking.

## Acceptance Criteria

1. **Given** I am panning or zooming the map
2. **When** the map movement stops (debounce)
4. **And** requests memories within that box from the backend (`GET /memories/map?bbox=...`)
5. **And** the response includes optimized playback and rendering data (`audioUrl`, `feeling`, `placeholderMetadata`) to prevent N+1 fetches
6. **And** renders pins for the returned memories at their precise GPS coordinates

## Tasks / Subtasks

- [x] Frontend: Map Implementation
  - [x] Implement `MapScreen` using `react-native-maps` (Google Maps on Android, Apple Maps on iOS).
  - [x] Handle `onRegionChangeComplete` event to detect movement stop.
  - [x] Implement Debounce Logic (500ms) to avoid request spam.
  - [x] Calculate Bounding Box (minLat, minLng, maxLat, maxLng) from region data.
- [x] Backend: Bounding Box Query Endpoint
  - [x] Implement `GET /memories/map`.
  - [x] Validate `bbox` query parameters.
  - [x] Implement bounding box query in `MemoriesService` (SQLite compatible, future PostGIS).
  - [x] Ensure `index` usage (composite index on [latitude, longitude]).
  - [x] Limit result set (max 50-100 pins) to prevent performance degradation.
- [x] Frontend: Pin Rendering
  - [x] Render `Marker` components for each memory.
  - [x] Use custom marker colors based on memory type and feeling.
  - [ ] Handle "Clustering" (Optional - deferred for performance optimization story)
- [x] Testing
  - [x] Verify API returns correct memories for a given bbox (6 unit tests passing).
  - [x] Verify map updates when panning to new area.
  - [ ] Verify performance (NFR2: <200ms response) - requires production load testing.

## Dev Notes

- **Performance:** Fetch optimized data for pins (ID, lat, lng, type, mediaUrl, feeling, placeholderMetadata). Fetching audio URLs now prevents critical playback latency later (NFR2).
- **Privacy:** Filter by `userId` (My Memories) in the query context.
- **Database:** Currently using SQLite instead of PostgreSQL/PostGIS. Bounding box queries implemented using simple latitude/longitude comparison operators (gte/lte). Will migrate to PostGIS ST_Within when database is upgraded.

### Project Structure Notes

- **Frontend:** `frontend/cross-platform/app/(tabs)/map.tsx`
- **Backend:** `src/memories/` - specialized `map` endpoint.

### References

- [Architecture: Database/PostGIS (Decision 3)](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture.md#decision-3-spatial-indexing--gist-on-location-column)
- [PRD: Functional Requirements F2](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/project-prd_v2_2025-12-19.md#f2-the-living-map--teleportation)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Completion Notes List

- **2025-12-23:** (Review Fix) Fixed critical viewport logic bug in `MemoriesService` to respect client bounding box (removed 100km radius forcing).
- **2025-12-23:** (Review Fix) Updated `memories.service.spec.ts` to match correct viewport logic.
- **2025-12-23:** (Review Fix) Refactored `MapComponent.native.tsx` to use extracted color constants.
- **2025-12-23:** (Review Fix) Fixed `styleURL` prop error in `MapComponent.native.tsx`.
- **2025-12-22:** Implemented backend `GET /memories/map` endpoint with bounding box query validation using `MapBoundingBoxQueryDto`.
- **2025-12-22:** Created `getMemoriesByBoundingBox()` service method with optimized field selection.
- **2025-12-22:** Added 6 unit tests for bounding box query - all passing (26/26 total tests pass).
- **2025-12-22:** Created `frontend/cross-platform/utils/geo.ts` with bounding box calculation utilities.
- **2025-12-22:** Created `useMapViewport` hook with 500ms debounce for viewport-based queries.
- **2025-12-22:** Updated `MemoriesContext` with `mapMemories` state and `fetchMemoriesByBoundingBox()` function.
- **2025-12-22:** Replaced placeholder with real `react-native-maps` MapView component.
- **2025-12-22:** Implemented Marker components with custom colors based on memory type/feeling.
- **2025-12-22:** Wired `onRegionChangeComplete` to trigger debounced bounding box queries.
- **2025-12-22:** Added long-press handler for manual pin placement on real map.
- **2025-12-22:** All TypeScript compilation passes.

### File List
- frontend/cross-platform/utils/geo.ts (New - bounding box calculation utilities)
- frontend/cross-platform/constants/MemoryUI.ts (New - memory UI constants)
- frontend/cross-platform/constants/Colors.ts (New - shared colors)
- frontend/cross-platform/hooks/useMapViewport.ts (New - debounced viewport hook)
- frontend/cross-platform/context/MemoriesContext.tsx (Modified - added mapMemories, fetchMemoriesByBoundingBox)
- frontend/cross-platform/app/(tabs)/map.tsx (Modified - real MapView with Markers, viewport logic)
- backend/v1_nestjs/src/memories/dto/map-bounding-box-query.dto.ts (New - bbox query DTO)
- backend/v1_nestjs/src/memories/dto/index.ts (Modified - export new DTO)
- backend/v1_nestjs/src/memories/controllers/memories.controller.ts (Modified - added GET /memories/map)
- backend/v1_nestjs/src/memories/services/memories.service.ts (Modified - added getMemoriesByBoundingBox)
- backend/v1_nestjs/src/memories/services/memories.service.spec.ts (Modified - added 6 bbox query tests)

## Change Log

- 2025-12-23: (Review Fix) Implemented International Date Line crossing logic in backend (Split Query) and frontend (geo.ts).
- 2025-12-23: (Review Fix) Reduced Map Viewport debounce to 200ms.
- 2025-12-23: (Review Fix) Added missing files (MemoryUI.ts, Colors.ts) to story record.
- 2025-12-22: Backend bounding box query endpoint implemented with full test coverage
- 2025-12-22: Frontend viewport logic integrated with debounce and optimized API calls
- 2025-12-22: Real map integration with react-native-maps MapView and Marker components
- 2025-12-22: Story marked for review
