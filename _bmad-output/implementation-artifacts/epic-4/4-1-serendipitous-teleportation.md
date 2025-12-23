# Story 4.1: Serendipitous Teleportation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

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

- [ ] Task 1: Backend Random Endpoint (AC: 4, 7)
  - [ ] Subtask 1.1: Create `GET /memories/random?exclude=id1,id2,id3` endpoint.
  - [ ] Subtask 1.2: Return full memory object: `{ id, latitude, longitude, voiceUrl?, imageUrl?, feeling }`.
  - [ ] Subtask 1.3: Handle edge case: If user has ≤5 memories, allow repeats but still randomize.
- [ ] Task 2: Teleport UI & Animation (AC: 1, 2, 3)
  - [ ] Subtask 2.1: Add FAB to `MapComponent` overlay.
  - [ ] Subtask 2.2: Create `ShutterFlash.tsx` component using `react-native-reanimated` (0.2s white flash).
  - [ ] Subtask 2.3: Coordinate animation sequence: Flash (0.2s) → Camera Move (0.8s) → Audio Play.
- [ ] Task 3: Teleport Logic & State (AC: 4, 7)
  - [ ] Subtask 3.1: Create `useTeleport` hook with local state tracking last 5 teleported IDs.
  - [ ] Subtask 3.2: Call backend with exclusion list, update map camera.
  - [ ] Subtask 3.3: Ensure `useMapViewport` ignores programmatic camera moves (no debounce trigger).
- [ ] Task 4: Audio Autoplay & Fallback (AC: 5)
  - [ ] Subtask 4.1: Attempt autoplay after camera animation completes.
  - [ ] Subtask 4.2: Catch autoplay rejection (browser policy) and show "Play" button overlay.
- [ ] Task 5: Empty State (AC: 6)
  - [ ] Subtask 5.1: Check memory count before teleport.
  - [ ] Subtask 5.2: Show modal with CTA: "Create Memory" button that navigates to map pin creation.

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

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Defined explicit backend API contract for random endpoint.
- Added anti-repeat mechanism (last 5 exclusions).
- Coordinated animation sequence timing.
- Added autoplay fallback for browser restrictions.
- Specified empty state modal with CTA.

### File List

- `frontend/cross-platform/components/map/TeleportButton.tsx`
- `frontend/cross-platform/components/map/ShutterFlash.tsx`
- `frontend/cross-platform/hooks/useTeleport.ts`
- `backend/v1_nestjs/src/memories/memories.controller.ts`
