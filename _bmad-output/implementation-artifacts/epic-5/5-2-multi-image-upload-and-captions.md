# Story 5.2: Multi-Image Upload and Captions

Status: ready-for-dev

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

- [ ] Task 1: Backend PostMedia Entity (AC: 5)
  - [ ] Subtask 1.1: Create `PostMedia` entity with fields: `postId`, `mediaUrl`, `caption`, `sortOrder`, `type`.
  - [ ] Subtask 1.2: Add validation: max 10 media items per post, caption max 200 chars.
  - [ ] Subtask 1.3: Update `Post` entity with `OneToMany` relation to `PostMedia`.
- [ ] Task 2: UI Enhancement (AC: 2, 3, 4)
  - [ ] Subtask 2.1: Create `ImageGalleryEditor` component with drag-and-drop reordering (`react-beautiful-dnd` or native).
  - [ ] Subtask 2.2: Add "Edit Caption" modal with character counter.
  - [ ] Subtask 2.3: Validate max 10 images client-side before upload.

## Dev Notes

- **Architecture Patterns**:
  - **Data Model**: `Post` → `PostMedia` (one-to-many). Each media item has its own caption and order.
  - **Limits**: 10 images max prevents abuse and ensures reasonable load times.
  - **Caption Length**: 200 chars is enough for context without overwhelming the UI.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/posts/entities/post-media.entity.ts`
  - `frontend/cross-platform/components/social/ImageGalleryEditor.tsx`

- **Testing Standards**:
  - Test order preservation after drag-and-drop.
  - Test validation: 11th image rejected, 201-char caption rejected.

### References

- [Source: epics.md#Story 5.2]

## Dev Agent Record

### Completion Notes List

- Added explicit limits (10 images, 200 char captions).
- Specified drag-and-drop reordering.
- Defined PostMedia entity structure.

### File List

- `backend/v1_nestjs/src/social/posts/entities/post-media.entity.ts`
- `frontend/cross-platform/components/social/ImageGalleryEditor.tsx`
