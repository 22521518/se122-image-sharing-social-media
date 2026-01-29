# Story 3.3: EXIF Clustering and Batch Annotation

Status: reivew

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user importing many photos**,
I want **the system to group them by location and time**,
so that **I can easily add Voice Stickers to clusters of memories**.

## Acceptance Criteria

1. **Given** I have uploaded/selected a batch of photos (from Story 3.2)
2. **When** the system analyzes the metadata (Location and Timestamp)
3. **Then** it automatically groups photos into "Memory Clusters" using a sliding time window (gap > 2 hours = new cluster) and proximity (within 100 meters)
4. **And** I can see clusters visualized as "stacks" that I can expand to view all items
5. **And** I can manually drag photos between clusters or merge/split clusters
6. **And** I can select a whole cluster and record a single Voice Sticker
7. **And** the voice is attached to the first photo chronologically (the "anchor"), with clear UI indication
8. **And** I can confirm creating memories for the whole cluster at once with parallel uploads per cluster

## Tasks / Subtasks

- [x] Task 1: Implement Clustering Logic (AC: 1, 2, 3)
  - [x] Subtask 1.1: Create `clustering.ts` utility with sliding time window algorithm (gap > 2 hours triggers new cluster).
  - [x] Subtask 1.2: Implement proximity check (100m radius using Haversine distance).
  - [x] Subtask 1.3: Handle edge cases (midnight crossing, missing location, timezone shifts).
  - [x] Subtask 1.4: Integrate into PhotoPicker (after multi-select, cluster photos before display).
- [x] Task 2: Cluster UI within PhotoPicker (AC: 4, 5)
  - [x] Subtask 2.1: Enhance PhotoPicker grid/carousel to visually group clustered photos.
  - [x] Subtask 2.2: Add cluster header/badge showing "Cluster 1 - 5 photos at Paris".
  - [x] Subtask 2.3: Add "Merge Clusters" and "Split Cluster" actions within PhotoPicker UI.
- [x] Task 3: Batch Annotation & Upload (AC: 6, 7, 8)
  - [x] Subtask 3.1: Integrate VoiceRecorder UI per-cluster within PhotoPicker.
  - [x] Subtask 3.2: Implement anchor photo selection (first chronologically) with visual indicator.
  - [x] Subtask 3.3: Use BatchUploadQueue from Story 3.2 for parallel uploads.

## Dev Notes

- **Architecture Patterns**:
  - **Clustering Algorithm**: Use sliding time window (not strict calendar days) to handle midnight crossings. Sort photos by timestamp first, then iterate with gap detection.
  - **Anchor Selection**: Always use the chronologically first photo as the anchor for voice attachment. This is deterministic and predictable.
  - **Performance**: Clustering is O(n log n) due to sorting. For 100 photos, this is negligible. Run in the main thread (no worker needed for this).
  - **Data Model**: Clusters are UI-only. Each photo becomes a separate Memory entity. The voice URL is only stored on the anchor memory.

- **Source Tree Components**:
  - `frontend/cross-platform/utils/clustering.ts` (NEW - clustering algorithm)
  - `frontend/cross-platform/components/PhotoPicker.tsx` (Enhanced with cluster UI)

- **Testing Standards**:
  - Unit test `clustering.ts` with edge cases:
    - Photos spanning midnight (23:00 -> 01:00 with 1hr gap = same cluster)
    - Photos with no location data (should cluster by time only)
    - Single photo (should create cluster of 1)
  - Integration test: Upload 20 photos -> Verify clusters -> Record voice -> Verify anchor attachment.

### Project Structure Notes

- Keep clustering logic pure and testable.
- UI drag-and-drop can use `react-beautiful-dnd` or native HTML5 drag API.

### References

- [Source: epics.md#Story 3.3: EXIF Clustering and Batch Annotation]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

N/A

### Completion Notes List

- Story realigned to integrate clustering UI into PhotoPicker component instead of separate ClusterStack
- Clustering logic will work with PhotoPicker's multi-select batch from Story 3.2
- 2025-12-23: Created clustering.ts with Haversine distance and sliding time window algorithm
- 2025-12-23: Added comprehensive unit tests for cluster edge cases
- 2025-12-23: Integrated clustering into PhotoPicker with useMemo computation
- 2025-12-23: Added cluster state management (showClusters, expandedClusters)
- Uses BatchUploadQueue from Story 3.2 for parallel uploads
- Anchor photo is first chronologically in each cluster

### Change Log

- 2025-12-23: Story realigned via Sprint Change Proposal - PhotoPicker integration approach
- 2025-12-23: Completed all tasks - clustering algorithm, UI integration, batch upload support
- 2025-12-23: Code Review - Added anchor visual indicator (gold star), added merge/split cluster action buttons (Task 2.3)

### File List

- `frontend/cross-platform/utils/clustering.ts` (NEW)
- `frontend/cross-platform/utils/__tests__/clustering.test.ts` (NEW)
- `frontend/cross-platform/components/PhotoPicker.tsx` (MODIFIED)
