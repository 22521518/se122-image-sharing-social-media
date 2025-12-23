# Story 2.4b: Filmstrip Rendering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user browsing the map,
I want to see a filmstrip of thumbnails for the visible pins,
so that I can preview the visual content without clicking every pin.

## Acceptance Criteria

1. **Given** the Map Viewport Logic (Story 2.4a) has updated the list of visible memories
2. **When** the memory list changes
3. **Then** the "Memory Filmstrip" updates dynamically to show thumbnails of those memories
4. **And** clicking a filmstrip item centers the map on that specific pin and triggers its Voice Sticker
5. **And** the filmstrip handles cases with large numbers of pins (e.g., virtualization or pagination)

## Tasks / Subtasks

- [x] Frontend: Filmstrip UI
  - [x] Implement horizontal `FlatList` component overlaying the bottom of the map.
  - [x] Styles: semi-transparent, floating above map content.
- [x] Frontend: Data Binding
  - [x] Bind `FlatList` data source to the `visibleMemories` state (from Story 2.4a).
  - [x] Implement `renderItem` to show memory thumbnail (or placeholder icon for Voice-only).
- [x] Frontend: Interaction
  - [x] Implement `onPress` handler for items.
  - [x] Action: Animate map to memory coordinate (`mapRef.animateToRegion`).
  - [x] Action: Highlight appropriate pin on map.
  - [x] Action: Trigger Audio Playback (Voice Sticker MVP requirement - "click... triggers Voice Sticker").
- [x] Frontend: Synchronization (Two-way)
  - [x] (Optional/Nice-to-have) When clicking a Pin on the map, scroll Filmstrip to the corresponding item.
- [x] Testing
  - [x] Verify filmstrip updates when map moves.
  - [x] Verify clicking filmstrip item centers map and plays audio.

## Dev Notes

- **Performance:** Use `FlatList` with `horizontal={true}`. Ensure image optimizations (thumbnails) are used.
- **State:** The state for `visibleMemories` needs to be shared between the Map View (pins) and the Filmstrip. This suggests a common parent component `MapScreen` holding the state, or a Context.
- **Audio:** Playback logic is shared here. Reuse the `AudioService/Context` hook.

### Project Structure Notes

- **Frontend:** `frontend/cross-platform/components/map/Filmstrip.tsx` (New)

### References

- [PRD: Functional Requirements F2](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/project-prd_v2_2025-12-19.md#f2-the-living-map--teleportation)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Completion Notes List

- **2025-12-23:** Created `Filmstrip.tsx` component with horizontal FlatList for memory thumbnails.
- **2025-12-23:** Implemented thumbnail rendering with photo images and placeholder icons for voice-only memories.
- **2025-12-23:** Added audio playback using expo-av for voice memories on filmstrip item press.
- **2025-12-23:** Integrated Filmstrip into desktop layout of `map.tsx` with map centering on press.
- **2025-12-23:** Added `selectedMemoryId` state for two-way sync visual feedback.
- **2025-12-23:** FlatList uses virtualization with `getItemLayout`, `removeClippedSubviews`, and optimized render batching (AC5).
- **2025-12-23:** TypeScript compilation passes (0 errors).
- **2025-12-23:** Fixed audio playback to use `expo-audio` with `useAudioPlayer` hook instead of deprecated `expo-av`.

### File List
- frontend/cross-platform/components/map/Filmstrip.tsx (New - horizontal FlatList filmstrip with audio playback)
- frontend/cross-platform/app/(tabs)/map.tsx (Modified - integrated Filmstrip, added selectedMemoryId state, handleFilmstripMemoryPress callback)

## Change Log

- 2025-12-23: Story marked for review after implementing Filmstrip component and integration
- 2025-12-23: Code Review completed. Fixed audio playback bug, implemented two-way sync map->filmstrip, centralized UI constants in `MemoryUI.ts`, and added unit tests. Status -> done.
