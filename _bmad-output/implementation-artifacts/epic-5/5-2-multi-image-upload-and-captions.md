# Story 5.2: Multi-Image Upload and Captions

Status: reivew

## Story

As a **user sharing a gallery**,
I want **to upload multiple images at once and add a caption to each**,
so that **I can tell a detailed story**.

## Acceptance Criteria

1. **Given** I am adding images to a post (Story 5.1)
2. **When** I select multiple files for upload (max 10 images per post)
3. **Then** the UI displays them in a reorderable list/grid with drag-and-drop
4. **And** I can tap a specific image to add a unique caption (max 200 chars per caption)
5. **And** all images and their metadata (order, captions) are saved with the post via `PostMedia` entity

## Tasks / Subtasks

- [x] Task 1: Backend PostMedia Entity (AC: 5)
  - [x] Subtask 1.1: Modify `Media` entity with fields: `caption`, `sortOrder`, `postId`. (Note: Implementation favored modifying existing Media table over new join table for simplicity).
  - [x] Subtask 1.2: Add validation: max 10 media items per post, caption max 200 chars.
  - [x] Subtask 1.3: Update `Post` entity with `OneToMany` relation to `Media`.
- [x] Task 2: UI Enhancement (AC: 2, 3, 4)
  - [x] Subtask 2.1: Create `ImageGalleryEditor` component with drag-and-drop reordering (`react-beautiful-dnd` or native).
  - [x] Subtask 2.2: Add "Edit Caption" modal with character counter.
  - [x] Subtask 2.3: Validate max 10 images client-side before upload.

## Dev Notes

- **Architecture Patterns**:
  - **Data Model**: `Post` → `Media` (one-to-many). Each media item has its own caption and order.
  - **Limits**: 10 images max prevents abuse and ensures reasonable load times.
  - **Caption Length**: 200 chars is enough for context without overwhelming the UI.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/posts/entities/post-media.entity.ts` (Not created - used schema.prisma)
  - `frontend/cross-platform/components/social/ImageGalleryEditor.tsx`

- **Testing Standards**:
  - Test order preservation after drag-and-drop.
  - Test validation: 11th image rejected, 201-char caption rejected.

### References

- [Source: epics.md#Story 5.2]

## Dev Agent Record

### Implementation Plan

**Backend Implementation**:
1. Extended Prisma `Media` model with `caption` (max 200 chars) and `sortOrder` fields
2. Migrated database schema using `prisma db push`
3. Updated `CreatePostDto` to include `mediaMetadata` array
4. Enhanced `PostsService.createPost` with:
   - AC 2: Validation for max 10 media items
   - AC 4: Validation for max 200 char captions
   - AC 5: Transaction to update each media item with caption and sortOrder
5. Regenerated Prisma client
6. Added comprehensive unit tests (15 passing tests including boundary tests)

**Frontend Implementation**:
1. Created `ImageGalleryEditor` component (`components/social/ImageGalleryEditor.tsx`):
   - AC 3: Drag-and-drop reordering using `react-native-draggable-flatlist`
   - AC 4: Caption editing modal with character counter (max 200 chars)
   - Visual order indicators and caption previews
   - Remove image functionality
2. Updated `CreatePostScreen` (`app/post/create.tsx`):
   - AC 2: Client-side validation (max 10 images)
   - Integrated `ImageGalleryEditor` component
   - Updated image picker to enforce 10-image limit
   - Built mediaMetadata array before post creation
3. Updated `SocialContext.tsx` to pass mediaMetadata through optimistic updates
4. Updated `social.service.ts` to send mediaMetadata to backend API
5. Installed `react-native-draggable-flatlist@^4.0.1` dependency

### Completion Notes List

- ✅ **Task 1.1**: Extended Media model with `caption` and `sortOrder` fields in Prisma schema (Deviation from plan: Used existing Media table instead of new PostMedia table)
- ✅ **Task 1.2**: Implemented validation in PostsService: max 10 media + max 200 char captions
- ✅ **Task 1.3**: Post-Media OneToMany relation already existed, enhanced with metadata handling
- ✅ **Task 2.1**: Created ImageGalleryEditor with react-native-draggable-flatlist for reordering
- ✅ **Task 2.2**: Implemented caption edit modal with character counter (200 char limit)
- ✅ **Task 2.3**: Added client-side validation in pickImage to enforce 10-image limit
- ✅ **All 15 backend tests passing** including boundary tests (exactly 10 images, exactly 200 chars)
- ✅ **Red-Green-Refactor cycle followed**: Tests written first (RED), then implementation (GREEN)

This implementation follows AC 2-5 exactly:
- **AC 2**: Max 10 images enforced both client (picker) and server (service validation)
- **AC 3**: Drag-and-drop reordering with visual order indicators
- **AC 4**: Per-image captions with 200 char limit + character counter
- **AC 5**: All metadata (caption, sortOrder) saved via PostMedia/Media updates in transaction

### File List

**Backend:**
- `backend/v1_nestjs/prisma/schema/schema.prisma` (Modified: added caption & sortOrder to Media model)
- `backend/v1_nestjs/src/social/posts/dto/create-post.dto.ts` (Modified: added mediaMetadata field)
- `backend/v1_nestjs/src/social/posts/posts.service.ts` (Modified: validation + metadata handling)
- `backend/v1_nestjs/src/social/posts/posts.service.spec.ts` (Modified: added 5 new tests for Story 5.2)

**Frontend:**
- `frontend/cross-platform/components/social/ImageGalleryEditor.tsx` (NEW: drag-drop gallery editor)
- `frontend/cross-platform/app/post/create.tsx` (Modified: integrated ImageGalleryEditor + validation)
- `frontend/cross-platform/context/SocialContext.tsx` (Modified: mediaMetadata support)
- `frontend/cross-platform/services/social.service.ts` (Modified: mediaMetadata in createPost)
- `frontend/cross-platform/package.json` (Modified: added react-native-draggable-flatlist dependency)

### Change Log

- **2025-12-24**: Completed Story 5.2 - Multi-Image Upload and Captions
  - Backend: Extended Media model with caption/sortOrder, added validation (max 10 images, 200 char captions)
  - Frontend: Created ImageGalleryEditor with drag-drop reordering and caption editing
  - Tests: 15 backend unit tests passing including boundary cases
  - All acceptance criteria met (AC 2-5)
- **2025-12-24 [Code Review]**: Fixed Critical & Low Issues
  - Frontend: Fixed broken drag-and-drop by changing keyExtractor to use `item.uri` instead of unstable `index`.
  - Frontend: Removed unused styles (`previewImage`, `removeButton`) in `ImageGalleryEditor.tsx`.
  - Docs: Corrected "PostMedia" entity discrepancy in Story file tasks list.
- **2025-12-25 [Code Review #2]**: Fixed HIGH severity DTO validation issue
  - Backend: Added `MediaMetadataDto` class with `@ValidateNested`, `@Type`, `@IsUUID`, `@MaxLength(200)` decorators
  - Backend: Added `@ArrayMaxSize(10)` on mediaMetadata array

