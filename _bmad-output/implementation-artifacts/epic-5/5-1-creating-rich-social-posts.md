# Story 5.1: Creating Rich Social Posts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to create a post with text, hashtags, and multiple images or Voice Stickers**,
so that **I can share my experiences with my community**.

## Acceptance Criteria

1. **Given** I am on the "Create Post" screen
2. **When** I enter text content (max 2000 characters) with optional hashtags
3. **And** I attach one or more media items (photos or voice) via two-phase upload
4. **And** I select a privacy level (default: Friends, options: Public/Friends)
5. **Then** the system creates a new `Post` record with extracted hashtags stored in a separate table
6. **And** I am returned to the Feed/Profile where the new post appears immediately (optimistic UI)
7. **And** drafts are auto-saved locally every 30 seconds

## Tasks / Subtasks

- [ ] Task 1: Backend Post Entity & Hashtags (AC: 5)
  - [ ] Subtask 1.1: Create `Post` entity with fields: `authorId`, `content`, `privacy`, `createdAt`.
  - [ ] Subtask 1.2: Create `Hashtag` entity and `PostHashtag` junction table (many-to-many).
  - [ ] Subtask 1.3: Implement hashtag extraction: Regex `/\#(\w+)/g`, max 10 hashtags per post.
  - [ ] Subtask 1.4: Create `PostService.create` to handle hashtag extraction and linking.
- [ ] Task 2: Two-Phase Media Upload (AC: 3)
  - [ ] Subtask 2.1: Ensure `POST /media/upload` endpoint exists (from Story 0.3).
  - [ ] Subtask 2.2: Update `CreatePostScreen` to upload media first, collect IDs.
  - [ ] Subtask 2.3: Send mediaIds array in `POST /social/posts` payload.
- [ ] Task 3: Create Post UI (AC: 1, 2, 4, 7)
  - [ ] Subtask 3.1: Create `CreatePostScreen.tsx` with character counter (2000 max).
  - [ ] Subtask 3.2: Implement hashtag highlighting in text input (optional visual enhancement).
  - [ ] Subtask 3.3: Add Privacy Selector with "Friends" as default.
  - [ ] Subtask 3.4: Implement auto-save to AsyncStorage every 30s.
  - [ ] Subtask 3.5: Load draft on screen mount if exists.
- [ ] Task 4: Optimistic UI & API Integration (AC: 6)
  - [ ] Subtask 4.1: On submit, immediately add post to local feed state with `status: 'pending'`.
  - [ ] Subtask 4.2: Call `POST /social/posts` endpoint.
  - [ ] Subtask 4.3: On success, update post status to `'published'` and sync server ID.
  - [ ] Subtask 4.4: On failure, show retry option and mark post as `'failed'`.

## Dev Notes

- **Architecture Patterns**:
  - **Hashtag Storage**: Separate `Hashtag` table for efficient search/trending. Junction table `PostHashtag` for many-to-many.
  - **Two-Phase Upload**: CRITICAL - Media must be uploaded BEFORE post creation to avoid orphaned posts if upload fails.
  - **Character Limit**: 2000 chars prevents abuse and ensures consistent UI rendering.
  - **Privacy Default**: "Friends" is safer default than "Public" for user privacy.
  - **Optimistic UI**: Improves perceived performance. Show post immediately, update on server confirmation.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/social/posts/entities/post.entity.ts`
  - `backend/v1_nestjs/src/social/posts/entities/hashtag.entity.ts`
  - `backend/v1_nestjs/src/social/posts/posts.service.ts`
  - `backend/v1_nestjs/src/social/posts/posts.controller.ts`
  - `frontend/cross-platform/screens/social/CreatePostScreen.tsx`

- **Testing Standards**:
  - Unit test: Hashtag extraction regex with various inputs.
  - Integration test: Upload media → Create post → Verify hashtags saved.
  - Edge case: Network failure during post creation → Verify draft persists.

### Project Structure Notes

- New `social` module scaffolding required.
- Hashtag regex: `/\#(\w+)/g` captures alphanumeric hashtags only.

### References

- [Source: epics.md#Story 5.1: Creating Rich Social Posts]
- [Source: 01-PROJECT-CONTEXT.md#Account, Social, and Discovery Layer]

## Dev Agent Record

### Agent Model Used

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Defined hashtag extraction regex and storage schema.
- Enforced two-phase media upload flow.
- Added 2000 character limit.
- Specified "Friends" as default privacy.
- Added draft auto-save and optimistic UI.

### File List

- `backend/v1_nestjs/src/social/posts/posts.module.ts`
- `backend/v1_nestjs/src/social/posts/posts.service.ts`
- `backend/v1_nestjs/src/social/posts/posts.controller.ts`
- `backend/v1_nestjs/src/social/posts/entities/post.entity.ts`
- `backend/v1_nestjs/src/social/posts/entities/hashtag.entity.ts`
- `frontend/cross-platform/screens/social/CreatePostScreen.tsx`
