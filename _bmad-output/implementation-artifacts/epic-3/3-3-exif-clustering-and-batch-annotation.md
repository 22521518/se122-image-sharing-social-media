# Story 3.3: EXIF Clustering and Batch Annotation

Status: ready-for-dev

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

- [ ] Task 1: Implement Clustering Logic (AC: 1, 2, 3)
  - [ ] Subtask 1.1: Create `clustering.ts` utility with sliding time window algorithm (gap > 2 hours triggers new cluster).
  - [ ] Subtask 1.2: Implement proximity check (100m radius using Haversine distance).
  - [ ] Subtask 1.3: Handle edge cases (midnight crossing, missing location, timezone shifts).
  - [ ] Subtask 1.4: Integrate into `BulkImportScreen` (after file drop, before final preview).
- [ ] Task 2: Cluster UI & Manual Controls (AC: 4, 5)
  - [ ] Subtask 2.1: Create `ClusterStack` component with expand/collapse functionality.
  - [ ] Subtask 2.2: Implement drag-and-drop to move photos between clusters.
  - [ ] Subtask 2.3: Add "Merge Clusters" and "Split Cluster" actions.
- [ ] Task 3: Batch Annotation & Upload (AC: 6, 7, 8)
  - [ ] Subtask 3.1: Add Voice Recorder UI to the Cluster view.
  - [ ] Subtask 3.2: Attach voice to the first photo chronologically (anchor) with visual indicator.
  - [ ] Subtask 3.3: Implement parallel upload queue (3-5 concurrent per cluster) with progress tracking.

## Dev Notes

- **Architecture Patterns**:
  - **Clustering Algorithm**: Use sliding time window (not strict calendar days) to handle midnight crossings. Sort photos by timestamp first, then iterate with gap detection.
  - **Anchor Selection**: Always use the chronologically first photo as the anchor for voice attachment. This is deterministic and predictable.
  - **Performance**: Clustering is O(n log n) due to sorting. For 100 photos, this is negligible. Run in the main thread (no worker needed for this).
  - **Data Model**: Clusters are UI-only. Each photo becomes a separate Memory entity. The voice URL is only stored on the anchor memory.

- **Source Tree Components**:
  - `frontend/cross-platform/utils/clustering.ts`
  - `frontend/cross-platform/components/import/ClusterStack.tsx`
  - `frontend/cross-platform/screens/import/BulkImportScreen.tsx` (Enhanced)

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

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Defined sliding time window algorithm for robust clustering.
- Added manual cluster management (drag, merge, split).
- Clarified anchor photo selection (first chronologically).
- Added parallel upload optimization.

### File List

- `frontend/cross-platform/utils/clustering.ts`
- `frontend/cross-platform/components/import/ClusterStack.tsx`
