# Epic 2 Retrospective: Core Memory Capture & Living Map (PARTIAL)

**Date:** 2025-12-23
**Status:** In Progress (Partial Retro)
**Facilitator:** Scrum Master Agent

## Executive Summary

Epic 2 is nearing completion with **4 out of 5 stories DONE**. We have successfully delivered the core "Capture" experience: Voice Stickers, Photo Uploads with EXIF, and Feeling Pins. The "Living Map" experience is partially complete with the Filmstrip (2.4b) finished, but the core **Map Viewport Logic (2.4a)** remains in `review` due to complexity in spatial queries and state synchronization.

## 📊 Epic Statistics

- **Total Stories:** 5 (2-1 to 2-4b)
- **Completion Status:**
  - **Done:** 4 (80%) - Stories 2.1, 2.2, 2.3, 2.4b
  - **Review:** 1 (20%) - Story 2.4a (Map Viewport Logic)
  - **Backlog:** 0
- **Validation:** High. All completed stories have comprehensive unit tests (Servcie layer) and manual verification steps.

## ✅ What Went Well (Success Factors)

1.  **Media Capture Suite:** The "Audio-First" and "Feeling-First" concepts were translated into high-quality UI/UX. The `VoiceRecorder` component (press-and-hold) and `FeelingSelector` (metadata-driven gradients) provide a polished "capture" experience.
2.  **Filmstrip Implementation:** Story 2.4b (Filmstrip) was a highlight. We successfully implemented a virtualized horizontal list that syncs bidirectionally with the map (clicking pin -> scrolls filmstrip, clicking item -> centers map).
3.  **No Server-Side Generation:** We adhered strictly to the "Metadata-First" architecture for Feeling Pins, generating beautiful gradients on the client rather than wasting resources generating images on the server.

## 🚧 Challenges & Bottlenecks

1.  **Map Viewport Logic (The "Last Mile"):** Story 2.4a has proven the most difficult. Syncing the backend spatial query (SQLite bounding box) with the frontend's `onRegionChange` debounce logic required multiple iterations. It is currently in review to ensure it doesn't "jitter" or spam the API.
2.  **Audio Library Churn:** We spent significant time oscillating between `expo-av` (reliable but deprecated) and `expo-audio` (modern but alpha). We stabilized on a solution in 2.4b, but this consumed velocity.
3.  **State Management Complexity:** `MemoriesContext` is becoming a "God Object." It now manages: Recording State, Upload State, Map Viewport State, Visible Memories, and Selected Memory.

## 💡 Lessons Learned & Action Items

### 1. Immediate Actions (Finish Epic 2)
- **Priority:** **Complete Story 2.4a.** Focus on verifying the "BBOX" query logic in `MemoriesService` matches the client's visible region exactly.
- **Action:** Refactor `MemoriesContext` before Epic 3. Consider splitting `RecorderContext` (capture flow) from `MapContext` (browsing flow) to reduce complexity.

### 2. Technical Debt to Watch
- **Database:** We are still running **SQLite** for spatial queries (`latitude BETWEEN min AND max`). This works for MVP but will fail at scale. Migration to **PostGIS** is a documented requirement for Production.
- **Testing:** While backend service tests are robust (28+ tests), Frontend component testing (unit tests for React Native components) is lighter. We should add snapshot tests for the complex `Filmstrip` and `Map` interactions.

## 🎯 Next Steps

1.  Resolve final review items for **Story 2.4a**.
2.  Perform a final "Integration Walkthrough" of the entire Epic 2 flow (Capture -> View on Map -> Interact via Filmstrip).
3.  Mark Epic 2 as **DONE** and proceed to Epic 3 (Onboarding).
