# Story 4.1: Serendipitous Teleportation

Status: reivew

\u003c!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. --\u003e

## Story

As a **"nostalgic nomad"**,
I want **to click a "Teleport" button and be jumped to a random past memory**,
so that **I can experience a "shiver" of self-recognition from a forgotten moment**.

## Acceptance Criteria

1. **Given** I have existing memory pins on my map
2. **When** I click the "Teleport" button (FAB or menu item)
3. **Then** the UI triggers a 0.2s white-out "shutter flash" animation
4. **And** the map camera smoothly animates to a random memory (excluding recently shown ones)
5. **And** the associated Voice Sticker attempts to autoplay, with a fallback "Play" button if browser blocks autoplay
6. **And** if I have no memories, a modal prompts "Create your first memory to start teleporting!"
7. **And** the system tracks the last 5 teleported memories to avoid immediate repeats

## Tasks / Subtasks

- [x] Task 1: Backend Random Endpoint (AC: 4, 7)
  - [x] Subtask 1.1: Create `GET /memories/random?exclude=id1,id2,id3` endpoint.
  - [x] Subtask 1.2: Return full memory object: `{ id, latitude, longitude, voiceUrl?, imageUrl?, feeling }`.
  - [x] Subtask 1.3: Handle edge case: If user has ≤5 memories, allow repeats but still randomize.
- [x] Task 2: Teleport UI & Animation (AC: 1, 2, 3)
  - [x] Subtask 2.1: Add FAB to `MapComponent` overlay.
  - [x] Subtask 2.2: Create `ShutterFlash.tsx` component using `react-native-reanimated` (0.2s white flash).
  - [x] Subtask 2.3: Coordinate animation sequence: Flash (0.2s) → Camera Move (0.8s) → Audio Play.
- [x] Task 3: Teleport Logic & State (AC: 4, 7)
  - [x] Subtask 3.1: Create `useTeleport` hook with local state tracking last 5 teleported IDs.
  - [x] Subtask 3.2: Call backend with exclusion list, update map camera.
  - [x] Subtask 3.3: Ensure `useMapViewport` ignores programmatic camera moves (no debounce trigger).
- [x] Task 4: Audio Autoplay & Fallback (AC: 5)
  - [x] Subtask 4.1: Attempt autoplay after camera animation completes.
  - [x] Subtask 4.2: Catch autoplay rejection (browser policy) and show "Play" button overlay.
- [x] Task 5: Empty State (AC: 6)
  - [x] Subtask 5.1: Check memory count before teleport.
  - [x] Subtask 5.2: Show modal with CTA: "Create Memory" button that navigates to map pin creation.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Implement missing frontend tests for Teleport feature (`useTeleport`, `TeleportButton`, `ShutterFlash`).
- [x] [AI-Review][MEDIUM] Fix backend `getRandomMemory` to include `liked` status (User Experience issue).


## Dev Notes

- **Architecture Patterns**:
  - **Anti-Repeat Logic**: Client-side tracking (last 5 IDs) is sufficient for MVP. Send as query params to backend.
  - **Animation Coordination**: Use `async/await` or animation callbacks to sequence Flash → Camera → Audio.
  - **Autoplay Handling**: Web browsers require user interaction before autoplay. Catch the promise rejection and show UI fallback.
  - **Map Viewport**: The `useMapViewport` debounce should NOT trigger on programmatic camera moves. Add a flag or check the event source.

- **Source Tree Components**:
  - `frontend/cross-platform/components/map/TeleportButton.tsx`
  - `frontend/cross-platform/components/map/ShutterFlash.tsx`
  - `frontend/cross-platform/hooks/useTeleport.ts`
  - `backend/v1_nestjs/src/memories/memories.controller.ts` (Add random endpoint)

- **Testing Standards**:
  - Unit test: Random selection with exclusion list.
  - Integration test: Click → Flash → Camera → Audio (with autoplay mock).
  - Edge case: User with 0 memories sees modal, user with 3 memories can still teleport.

### Project Structure Notes

- Use `react-native-reanimated` for animations (already in project).
- Audio autoplay policy: https://developer.chrome.com/blog/autoplay/

### References

- [Source: epics.md#Story 4.1: Serendipitous Teleportation]
- [Source: 01-PROJECT-CONTEXT.md#Rediscovery & Time-Locked Postcards]

## Dev Agent Record

### Agent Model Used

Antigravity (Dev Agent - Amelia)

### Debug Log References

- Backend tests: `memories.service.spec.ts` - 5/5 tests passing for `getRandomMemory`
- Frontend tests: `useTeleport.test.ts`, `TeleportButton.test.tsx`, `ShutterFlash.test.tsx` - comprehensive coverage for all Teleport components

### Completion Notes List

- **Task 1**: Implemented `GET /memories/random` endpoint with exclusion list support. Edge case handling ensures ≤5 memories allow repeats. Service layer uses Prisma random offset. All 5 backend tests passing.
- **Task 2**: Created `ShutterFlash.tsx` with `react-native-reanimated` for 0.2s white flash animation. `TeleportButton.tsx` provides platform-aware FAB (mobile) and inline button (desktop). Animation sequence coordinated in `map.tsx` using timeouts.
- **Task 3**: `useTeleport.ts` hook tracks last 5 teleported IDs in `useRef`, calls backend with exclusion query params, and returns target memory for camera animation. Map camera uses `flyTo` method exposed by `MapComponentRef`.
- **Task 4**: Autoplay attempted after camera animation by opening `MemoryDetailModal` with `autoPlay={true}` prop. Modal handles autoplay rejection internally with fallback play button.
- **Task 5**: Empty state detected when `teleport()` returns null. Alert modal shown with "Create Memory" CTA that activates voice capture mode.

### File List

- `frontend/cross-platform/components/map/TeleportButton.tsx`
- `frontend/cross-platform/components/map/TeleportButton.test.tsx`
- `frontend/cross-platform/components/map/ShutterFlash.tsx`
- `frontend/cross-platform/components/map/ShutterFlash.test.tsx`
- `frontend/cross-platform/hooks/useTeleport.ts`
- `frontend/cross-platform/hooks/useTeleport.test.ts`
- `frontend/cross-platform/app/(tabs)/map.tsx`
- `backend/v1_nestjs/src/memories/controllers/memories.controller.ts`
- `backend/v1_nestjs/src/memories/services/memories.service.ts`
- `backend/v1_nestjs/src/memories/dto/random-memory-query.dto.ts`
- `backend/v1_nestjs/src/memories/dto/index.ts`
- `backend/v1_nestjs/src/memories/services/memories.service.spec.ts`

## Change Log

- **2025-12-25**: Initial implementation complete. All tasks verified and marked [x]. Backend tests all passing (5/5). Full teleport feature implemented with shutter flash animation, backend random endpoint with exclusion list, client-side history tracking, map camera animation, and empty state handling.
- **2025-12-25**: Code review follow-ups complete. Added comprehensive frontend tests for `useTeleport` hook (anti-repeat tracking, error handling), `TeleportButton` (FAB/inline variants, accessibility), and `ShutterFlash` (animation timing, callbacks). Fixed backend `getRandomMemory` to include `liked` status for better UX.
- **2025-12-25**: **Code review passed.** Story marked DONE. Added `memories.service.spec.ts` to File List.
