# Story 3.2: Bulk-Drop Wall for Historical Import

Status: reivew

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **new user with a large camera roll**,
I want **to select or drag-and-drop multiple photos using an enhanced photo picker**,
so that **I can quickly populate my life map with historical context**.

## Acceptance Criteria

1. **Given** I am using the enhanced PhotoPicker component with multiSelect={true}
2. **When** I select multiple photos via native picker OR drag-and-drop photos (Web only) (JPG/PNG/HEIC, max 100 items per batch, max 20MB per file)
3. **Then** the system visually acknowledges the selection and shows progress for EXIF processing
4. **And** the system processes files in a background Web Worker to extract EXIF (Date/Location) and calculate specific hashes
5. **And** it detects and flags duplicates (both within the batch and already on server)
1.  **Given** I am using the enhanced PhotoPicker component with multiSelect={true}
2.  **When** I select multiple photos via native picker OR drag-and-drop photos (Web only) (JPG/PNG/HEIC, max 100 items per batch, max 20MB per file)
3.  **Then** the system visually acknowledges the selection and shows progress for EXIF processing
4.  **And** the system processes files in a background Web Worker to extract EXIF (Date/Location) and calculate specific hashes
5.  **And** it detects and flags duplicates (both within the batch and already on server)
6.  **And** it converts HEIC images to JPG client-side if necessary for preview
7.  **And** it displays a preview grid (Web) or carousel (Mobile) with status indicators (Ready, Duplicate, date-fallback used, No Location)
8.  **And** I can confirm to proceed with the upload/creation of these memories

## Tasks / Subtasks

- [x] Task 1: Enhance PhotoPicker for Multi-Select & Drag-Drop (Web) (AC: 1, 2, 3)
  - [x] Subtask 1.1: Add drag-and-drop zone to PhotoPicker (web-specific, `react-dropzone` or native HTML5 API).
  - [x] Subtask 1.2: Enhance file validation for bulk mode (Size < 20MB, Types: image/*, .heic, max 9 files).
  - [x] Subtask 1.3: Add progress indicator during EXIF extraction for multi-select batch.
  - [x] Subtask 1.4: Restyle the layout of both web-based/mobile PhotoPicker to be more compact and user-friendly by grid 3 x 3, avoid exceed the size of container. 
- [x] Task 2: Client-Side Processing (Worker) (AC: 4, 6)
  - [x] Subtask 2.1: Create `file-processor.worker.ts` to handle hefty tasks off main thread.
  - [x] Subtask 2.2: Implement EXIF extraction with fallback to `file.lastModified` if `DateTimeOriginal` is missing.
  - [x] Subtask 2.3: Implement HEIC conversion using `heic2any`.
  - [x] Subtask 2.4: Calculate lightweight hash (SHA-256 of first 4KB + size) for duplicate detection.
- [x] Task 3: State & Upload Management (AC: 5, 7, 8)
  - [x] Subtask 3.1: Check server for existing hashes (POST `/memories/check-duplicates` with list of hashes).
  - [x] Subtask 3.2: Enhance PhotoPicker grid/carousel UI with `Duplicate` warnings and `LocationMissing` input fields.
  - [x] Subtask 3.3: Implement batched upload queue (upload 3-5 concurrent files) to respect rate limits.
  - [x] Subtask 3.4: Move the "Confirm Photo Upload" features section in frontend\cross-platform\app\(tabs)\map.tsx into the PhotoPicker component, that allows to confirm the upload of the selected photos. 

## Dev Notes

- **Architecture Patterns**:
  - **Performance**: PROCESSING IMAGES IS EXPENSIVE. **Strictly** use a Web Worker (`Worker` API) to prevent freezing the UI.
  - **Deduplication**: Implement a "Check" phase before "Upload". Send hashes to backend -> Backend returns Set of existing hashes -> UI marks duplicates.
  - **HEIC**: Essential for Apple users. Use `heic2any` library but strip it from the React Native bundle (Web only dynamic import).

- **Source Tree Components**:
  - `frontend/cross-platform/components/PhotoPicker.tsx` (Enhanced for multi-select + drag-drop)
  - `frontend/cross-platform/utils/file-processor.worker.ts` (NEW - EXIF processing)
  - `frontend/cross-platform/utils/BatchUploadQueue.ts` (NEW - concurrent uploads)
  - `frontend/web-specific/utils/heic-converter.ts` (NEW - HEIC to JPEG conversion, web-only)

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

Antigravity

### Debug Log References

N/A

### Completion Notes List

- Story realigned to integrate bulk import features into PhotoPicker component instead of separate screen
- Implementation in progress as of 2025-12-23 (Sprint Change Proposal approved)
- 2025-12-23: Implemented drag-and-drop using react-dropzone for web platforms
- 2025-12-23: Added file validation (20MB max, 100 files max, image/* types)
- 2025-12-23: Created file-processor.worker.ts for background EXIF extraction and hash calculation
- 2025-12-23: Created heic-converter.ts for web-only HEIC to JPEG conversion
- 2025-12-23: Created BatchUploadQueue.ts for concurrent uploads with progress tracking
- 2025-12-23: Added progress indicator UI during EXIF processing
- 2025-12-23: Added duplicate detection indicator in stats row
- Backend checkDuplicates endpoint already implemented

### Change Log

- 2025-12-23: Story realigned via Sprint Change Proposal - PhotoPicker enhancement approach
- 2025-12-23: Completed all tasks - drag-drop, file validation, worker, HEIC conversion, batch upload, duplicate detection
- 2025-12-23: Subtask 1.4 - Restyled PhotoPicker to use fixed 3x3 grid layout for both web and mobile, calculated item sizes to fit container
- 2025-12-23: Subtask 3.4 - Moved "Confirm Photo Upload" panel into PhotoPicker via showConfirmPanel prop and onConfirmUpload callback. Updated map.tsx to use new API.
- 2025-12-23: Code Review - Fixed import.meta worker loading error, added duplicate/date-fallback status badges (AC 7), added unit tests for worker and BatchUploadQueue

### File List

- `frontend/cross-platform/components/PhotoPicker.tsx` (MODIFIED)
- `frontend/cross-platform/utils/file-processor.worker.ts` (NEW)
- `frontend/cross-platform/utils/BatchUploadQueue.ts` (NEW)
- `frontend/web-specific/utils/heic-converter.ts` (NEW)
- `frontend/cross-platform/utils/worker-factory.ts` (MODIFIED)
- `frontend/cross-platform/utils/__tests__/BatchUploadQueue.test.ts` (NEW)
- `frontend/cross-platform/utils/__tests__/file-processor.worker.test.ts` (NEW)
- `backend/v1_nestjs/src/memories/dto/check-duplicates.dto.ts` (EXISTING)
- `backend/v1_nestjs/src/memories/services/memories.service.ts` (EXISTING - checkDuplicates method)
- `backend/v1_nestjs/src/memories/controllers/memories.controller.ts` (EXISTING - /check-duplicates endpoint)
- `backend/v1_nestjs/prisma/schema/schema.prisma` (EXISTING - contentHash field)
