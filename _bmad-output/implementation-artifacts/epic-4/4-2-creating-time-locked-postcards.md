# Story 4.2: Creating Time-Locked Postcards

Status: ready-for-dev

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

- [ ] Task 1: Backend Postcard Entity & Security (AC: 7)
  - [ ] Subtask 1.1: Create `Postcard` entity with fields: `senderId`, `recipientId`, `unlockDate?`, `unlockLocation?`, `message`, `mediaUrl`, `status`.
  - [ ] Subtask 1.2: Add validation: Exactly ONE of `unlockDate` OR `unlockLocation` must be set (XOR logic).
  - [ ] Subtask 1.3: Implement API response filtering: If `status === LOCKED`, exclude `message` and `mediaUrl` from GET responses.
- [ ] Task 2: Friend Validation (AC: 5)
  - [ ] Subtask 2.1: Query `Follows` or `Friends` table to verify recipient is in user's friend graph.
  - [ ] Subtask 2.2: Return error if recipient doesn't exist or friendship not established.
- [ ] Task 3: Postcard Composer UI (AC: 3, 4, 5, 6)
  - [ ] Subtask 3.1: Create `PostcardComposer.tsx` with toggle: "Unlock by Date" vs "Unlock by Location".
  - [ ] Subtask 3.2: Implement Date Picker (min: tomorrow, max: 1 year from now).
  - [ ] Subtask 3.3: Implement Location Picker (default: current location, or map selection).
  - [ ] Subtask 3.4: Implement Friend Picker (fetch from `/social/friends`).
  - [ ] Subtask 3.5: Add "Preview" button showing locked state UI before final send.
  - [ ] Subtask 3.6: Add draft save functionality (local storage or backend `status: DRAFT`).
- [ ] Task 4: Notification on Send (AC: 8)
  - [ ] Subtask 4.1: Trigger notification to recipient on postcard creation.
  - [ ] Subtask 4.2: Notification text: "You have a locked postcard from {senderName}!"

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

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Defined XOR unlock logic (date OR location, not both).
- Added friend validation requirements.
- Specified content security mechanism (API filtering).
- Added preview and draft functionality.
- Added immediate notification on send.

### File List

- `backend/v1_nestjs/src/postcards/postcards.module.ts`
- `backend/v1_nestjs/src/postcards/postcards.service.ts`
- `backend/v1_nestjs/src/postcards/postcards.controller.ts`
- `backend/v1_nestjs/src/postcards/entities/postcard.entity.ts`
- `backend/v1_nestjs/src/postcards/dto/postcard-response.dto.ts`
- `frontend/cross-platform/screens/postcards/PostcardComposer.tsx`
