# Story 3.2: Bulk-Drop Wall for Historical Import

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **new user with a large camera roll**,
I want **to drag and drop a folder of photos onto the web app**,
so that **I can quickly populate my life map with historical context**.

## Acceptance Criteria

1. **Given** I am on the "Bulk-Drop Wall" page (Web only)
2. **When** I drag and drop a selection of photos (JPG/PNG/HEIC, max 100 items per batch, max 20MB per file)
3. **Then** the system visually acknowledges the drop and shows a progress bar for processing
4. **And** the system processes files in a background Web Worker to extract EXIF (Date/Location) and calculate specific hashes
5. **And** it detects and flags duplicates (both within the batch and already on server)
6. **And** it converts HEIC images to JPG client-side if necessary for preview
7. **And** it displays a preview grid with status indicators (Ready, Duplicate, date-fallback used, No Location)
8. **And** I can confirm to proceed with the upload/creation of these memories

## Tasks / Subtasks

- [ ] Task 1: UI & Drop Zone (Web) (AC: 1, 2, 3)
  - [ ] Subtask 1.1: Create `BulkImportScreen.tsx` with `react-dropzone`.
  - [ ] Subtask 1.2: Implement file validation (Size < 20MB, Types: image/*, .heic).
  - [ ] Subtask 1.3: Create `ImportProgress` component to show processing status (e.g., "Processing 5/42...").
- [ ] Task 2: Client-Side Processing (Worker) (AC: 4, 6)
  - [ ] Subtask 2.1: Create `file-processor.worker.ts` to handle hefty tasks off main thread.
  - [ ] Subtask 2.2: Implement EXIF extraction (`exif-js`) with fallback to `file.lastModified` if `DateTimeOriginal` is missing.
  - [ ] Subtask 2.3: Implement HEIC conversion using `heic2any`.
  - [ ] Subtask 2.4: Calculate lightweight hash (e.g., SHA-256 of first 4KB + size) for duplicate detection.
- [ ] Task 3: State & Upload Management (AC: 5, 7, 8)
  - [ ] Subtask 3.1: Check server for existing hashes (POST `/memories/check-duplicates` with list of hashes).
  - [ ] Subtask 3.2: Render `ImportPreviewGrid` with `Duplicate` warnings and `LocationMissing` input fields.
  - [ ] Subtask 3.3: Implement batched upload queue (upload 3-5 concurrent files) to respect rate limits.

## Dev Notes

- **Architecture Patterns**:
  - **Performance**: PROCESSING IMAGES IS EXPENSIVE. **Strictly** use a Web Worker (`Worker` API) to prevent freezing the UI.
  - **Deduplication**: Implement a "Check" phase before "Upload". Send hashes to backend -> Backend returns Set of existing hashes -> UI marks duplicates.
  - **HEIC**: Essential for Apple users. Use `heic2any` library but strip it from the React Native bundle (Web only dynamic import).

- **Source Tree Components**:
  - `frontend/cross-platform/screens/import/BulkImportScreen.tsx`
  - `frontend/cross-platform/workers/file-processor.worker.ts` (New worker support)
  - `frontend/web-specific/utils/heic-converter.ts` (Platform specific)

- **Testing Standards**:
  - Unit test the Worker logic (mock file inputs).
  - Stress test with 100 images. Verify UI doesn't hang.

### Project Structure Notes

- Ensure `worker-loader` or Vite worker support is configured.

### References

- [Source: epics.md#Story 3.2: Bulk-Drop Wall for Historical Import]
- [Source: 01-PROJECT-CONTEXT.md#Onboarding & Bulk Import]

## Dev Agent Record

### Agent Model Used

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Added critical limits (100 files, 20MB).
- Mandated Web Worker for performance.
- Added HEIC support strategy.
- Added duplicate detection mechanism.

### File List

- `frontend/cross-platform/screens/import/BulkImportScreen.tsx`
- `frontend/cross-platform/workers/file-processor.worker.ts`
