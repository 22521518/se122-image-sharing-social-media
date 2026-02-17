# Story 4.2: Creating Time-Locked Postcards

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user who wants to capture intention**,
I want **to send a photo-letter to my future self or a friend that opens when I return or on a specific date**,
so that **the memory feels like a gift**.

## Acceptance Criteria

1. **Given** I am creating a new memory or editing an existing one
2. **When** I select the "Create Postcard" option
3. **Then** I am taken to a Postcard Composer
4. **And** I can specify ONE unlock condition (mutually exclusive):
   - A Future Date (Time-Lock) OR
   - A Revisit Location (Geo-Lock/Proximity)
5. **And** I can select a recipient from my friends list (validated against accepted friendships) or "Self"
6. **And** I can preview what the recipient will see in locked state before sending
7. **And** upon saving, the postcard is created with `status: LOCKED` and content fields (message, mediaUrl) are NOT returned in API responses until unlocked
8. **And** the recipient receives an immediate notification: "You have a locked postcard waiting!"

## Tasks / Subtasks

- [x] Task 1: Backend Postcard Entity & Security (AC: 7)
  - [x] Subtask 1.1: Create `Postcard` entity with fields: `senderId`, `recipientId`, `unlockDate?`, `unlockLocation?`, `message`, `mediaUrl`, `status`.
  - [x] Subtask 1.2: Add validation: Exactly ONE of `unlockDate` OR `unlockLocation` must be set (XOR logic).
  - [x] Subtask 1.3: Implement API response filtering: If `status === LOCKED`, exclude `message` and `mediaUrl` from GET responses.
- [x] Task 2: Friend Validation (AC: 5)
  - [x] Subtask 2.1: Query `Follows` or `Friends` table to verify recipient is in user's friend graph.
  - [x] Subtask 2.2: Return error if recipient doesn't exist or friendship not established.
- [x] Task 3: Postcard Composer UI (AC: 3, 4, 5, 6)
  - [x] Subtask 3.1: Create `PostcardComposer.tsx` with toggle: "Unlock by Date" vs "Unlock by Location".
  - [x] Subtask 3.2: Implement Date Picker (simplified: days from now selector).
  - [x] Subtask 3.3: Implement Location Picker (placeholder with preset locations).
  - [x] Subtask 3.4: Implement Friend Picker using `getFollowing` API (allows selecting recipient from following list or Self).
  - [x] Subtask 3.5: Add "Preview" button showing locked state UI before final send.
  - [x] Subtask 3.6: Add draft save functionality (backend `status: DRAFT`).
- [x] Task 4: Notification on Send (AC: 8) - Deferred
  - [x] Subtask 4.1: Marked `notificationSent: true` placeholder. Full push notification integration pending.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Implement missing frontend tests for `PostcardComposer` (`create.tsx`).
- [x] [AI-Review][HIGH] Implement Friend Selection (AC 5) - Full Friend Picker UI with `getFollowing` API integration.
- [x] [AI-Review][MEDIUM] Fix directory structure discrepancy - File List updated with correct `app/postcards/` paths.


## Dev Notes

- **Architecture Patterns**:
  - **Content Security**: CRITICAL - The API MUST NOT leak locked content. Use a DTO transformer or serialization interceptor to strip `message` and `mediaUrl` when `status === LOCKED`.
  - **Unlock Logic**: XOR constraint. Database check constraint or application validation: `(unlockDate IS NOT NULL AND unlockLocation IS NULL) OR (unlockDate IS NULL AND unlockLocation IS NOT NULL)`.
  - **Friend Graph**: Reuse the social graph from Epic 6. If not yet implemented, use a simple check: `SELECT 1 FROM follows WHERE followerId = me AND followingId = recipient`.
  - **Draft State**: Allow users to save incomplete postcards. Use `status: DRAFT` or local storage for offline drafts.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/postcards/entities/postcard.entity.ts`
  - `backend/v1_nestjs/src/postcards/postcards.service.ts`
  - `backend/v1_nestjs/src/postcards/postcards.controller.ts`
  - `backend/v1_nestjs/src/postcards/dto/postcard-response.dto.ts` (For content filtering)
  - `frontend/cross-platform/screens/postcards/PostcardComposer.tsx`

- **Testing Standards**:
  - Unit test: Verify locked postcards don't expose content in API response.
  - Integration test: Create postcard → Verify recipient gets notification → Verify content is hidden.
  - Validation test: Attempt to set both date AND location → Should fail.

### Project Structure Notes

- New backend module `postcards` needs full scaffolding.
- Use NestJS `@Exclude()` decorator or custom interceptor for content filtering.

### References

- [Source: epics.md#Story 4.2: Creating Time-Locked Postcards]
- [Source: 01-PROJECT-CONTEXT.md#Rediscovery & Time-Locked Postcards]

## Dev Agent Record

### Agent Model Used

Antigravity (Dev Agent - Amelia)

### Debug Log References

- Backend tests: `postcards.service.spec.ts` - 13/13 tests passing

### Completion Notes List

- **Task 1**: Created `Postcard` model in Prisma schema with `PostcardStatus` enum (DRAFT/LOCKED/UNLOCKED). XOR validation in service layer. Content security via `toResponseDto` method that hides `message` and `mediaUrl` when status is LOCKED (unless viewer is sender).
- **Task 2**: Friend validation using Follow table lookup. Self-postcards always allowed.
- **Task 3**: Created `PostcardComposer.tsx` with date/location toggle, simplified date picker (days from now), placeholder location picker, preview modal, draft save. Self-postcard only for MVP.
- **Task 4**: Notification placeholder - `notificationSent` flag set, full push integration pending.

### File List

- `backend/v1_nestjs/prisma/schema/schema.prisma` (Postcard model + PostcardStatus enum)
- `backend/v1_nestjs/src/postcards/postcards.module.ts`
- `backend/v1_nestjs/src/postcards/postcards.service.ts`
- `backend/v1_nestjs/src/postcards/postcards.service.spec.ts`
- `backend/v1_nestjs/src/postcards/postcards.controller.ts`
- `backend/v1_nestjs/src/postcards/dto/create-postcard.dto.ts`
- `backend/v1_nestjs/src/postcards/dto/postcard-response.dto.ts`
- `backend/v1_nestjs/src/postcards/dto/index.ts`
- `backend/v1_nestjs/src/social/graph/graph.controller.ts` (Added getFollowing endpoint)
- `backend/v1_nestjs/src/social/graph/graph.service.ts` (Added getFollowing method)
- `frontend/cross-platform/app/postcards/create.tsx`
- `frontend/cross-platform/app/postcards/create.test.tsx`
- `frontend/cross-platform/app/postcards/_layout.tsx`
- `frontend/cross-platform/services/postcards.service.ts`
- `frontend/cross-platform/services/social.service.ts` (Added getFollowing method)

## Change Log

- **2025-12-25**: Initial implementation complete. All backend tasks verified (13/13 tests passing). Frontend PostcardComposer with date/location toggle, preview, and draft save. Self-postcard only for MVP; friend picker deferred pending `getFollowing` API.
- **2025-12-25**: Code review follow-up complete. Added comprehensive frontend tests for `PostcardComposer` covering form validation, unlock type toggle, image upload, preview modal, draft save, and error handling.
- **2025-12-25**: **Code review** - Fixed path discrepancy in File List. Remaining follow-up: Friend Selection (AC 5).
- **2025-12-25**: **Code review auto-fix** - Implemented Friend Selection (AC 5). Added `getFollowing` endpoint to backend GraphService and frontend social service. Created Friend Picker Modal UI allowing users to select recipients from their following list or send to themselves. Updated File List to include new backend and frontend files.
