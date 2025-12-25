# AGENTS.md - System Context & Domain Map

## 1. System Overview

### Purpose
Cross-platform mobile/web application built with Expo and React Native, focusing on social image sharing, geo-located memories, and time-locked postcards.

### Technology Stack (CRITICAL)
| Category | Package | Description |
|----------|---------|-------------|
| **Core** | `expo`, `react-native` | Application runtime |
| **Navigation** | `expo-router` | File-based routing (`app/`) |
| **Maps** | `@maplibre/maplibre-react-native` (Native), `react-leaflet` (Web) | Platform-specific map rendering |
| **Audio** | `expo-audio` | **Must use** `useAudioPlayer`, `useAudioRecorder` (NOT `expo-av`) |
| **UI** | `@gorhom/bottom-sheet`, `react-native-reanimated` | Complex gestures and animations |
| **State** | React Context + Hooks | Global state management |

---

## 2. Domains & Codebase Map (Multi-Level Depth)

This section maps logical business domains to their concrete source code implementations.

### 2.1. Authentication & Identity
**Domain**: User registration, authentication, profile management, and secure session handling.
*   **State Management**: `AuthContext` (Token handling, Login/Logout methods).
*   **Key Source Codes**:
    *   `app/onboarding.tsx`: Entry point for unauthenticated users.
    *   `app/(auth)/login.tsx` & `signup.tsx`: Authentication forms.
    *   `app/profile/`: User profile viewing and editing screens.
    *   `services/users.service.ts`: API methods for fetching user profiles and updating data.
    *   `services/api.service.ts`: Base Axios instance with interceptors for JWT injection.

### 2.2. Social Feed & Dynamics
**Domain**: The central social experience including feeds, rich post creation, and engagement (likes, comments, follows).
*   **Key Source Codes**:
    *   **Feed & Display**:
        *   `app/(tabs)/index.tsx`: Main "Home" feed with infinite scroll.
        *   `components/social/PostCard.tsx`: The primary display unit for a social post.
        *   `services/social.service.ts`: API for fetching feeds, toggling likes, and managing follows.
    *   **Interactions**:
        *   `components/social/LikeButton.tsx`: Animated heart button with optimistic updates.
        *   `components/social/DoubleTapLike.tsx`: Wrapper for gesture-based liking.
        *   `components/social/CommentList.tsx`: Reusable comment thread component.
        *   `components/social/FollowButton.tsx`: Follow/Unfollow logic with state handling.
    *   **Creation**:
        *   `app/post/create.tsx`: Screen for composing new posts.
        *   `components/social/ImageGalleryEditor.tsx`: Captions and media selection/preview.

### 2.3. Spatial Memory & Teleportation
**Domain**: Geo-spatial exploration of content. Users can browse memories on a map or "Teleport" to random memories.
*   **Key Source Codes**:
    *   **Map Infrastructure**:
        *   `app/(tabs)/map.tsx`: The primary map screen controller.
        *   `components/map/MapComponent.native.tsx` & `.web.tsx`: Platform-abstracted map renderers.
    *   **Teleportation Feature**:
        *   `components/map/TeleportButton.tsx`: UI trigger for the teleport action.
        *   `components/map/ShutterFlash.tsx`: Visual transition effect (white-out) during teleport.
    *   **Memory Visualization**:
        *   `components/map/VisualMemoryCard.tsx`: Marker/Card representation on the map.
        *   `components/map/Filmstrip.tsx`: Horizontal scroll of memories in the viewport.
    *   **Services**:
        *   `services/media.service.ts`: Handling of media uploads/retrieval associated with memories.

### 2.4. Postcards (Time & Geo-Locked)
**Domain**: Asynchronous communication where content is locked by time duration or geographic distance.
*   **Key Source Codes**:
    *   `app/postcards/*`: Screens for listing received/sent postcards and creating new ones.
    *   `services/postcards.service.ts`: Logic for creating unlocking schedules and checking unlock criteria.

### 2.5. Content Moderation
**Domain**: Ensuring community safety through reporting and potential automated/manual review.
*   **Key Source Codes**:
    *   `components/moderation/*`: UI elements for flagging content.
    *   `services/moderation.service.ts`: Submission of reports to the backend.

### 2.6. Infrastructure & Utils
**Domain**: Shared code supporting all other domains.
*   **Key Source Codes**:
    *   `components/ui/*`: Fundamental UI atoms (Buttons, Text inputs).
    *   `components/themed-text.tsx`: Typography strictly adhering to the design system.
    *   `hooks/*`: Shared behavior (e.g., `useColorScheme`, audio hooks).
    *   `types/`: TypeScript definitions, specifically API DTOs.

---

## 3. Coding Conventions & Agent Rules

### DTO Pattern (MANDATORY)
All API calls **MUST** use the DTO pattern to decouple component data from API response format.

**API Response Envelope:**
```json
{
  "success": true,
  "data": { /* actual payload */ },
  "meta": { "timestamp": "..." }
}
```

**Implementation Rule:**
1.  Define DTO interface in `types/`.
2.  Use `ApiService` (or domain service) to fetching.
3.  Access `response.data`, NEVER assume root-level data.

### Common Mistakes to Avoid
*   ❌ `import { Audio } from 'expo-av'` -> **DEPRECATED**. Use `expo-audio`.
*   ❌ `router.push("/post/${id}")` -> **Use object syntax**: `router.push({ pathname: "/post/[id]", params: { id } })`.
*   ❌ Hardcoding standard colors. -> **Use** `constants/Colors.ts` or `ThemedText`/`ThemedView`.

### Rules for Dev Agents
1.  ✅ **Always** use typed DTOs for API responses.
2.  ✅ **Handle** the `{ success, data, meta }` envelope.
3.  ❌ **NEVER** hardcode API URLs. Use `EXPO_PUBLIC_API_URL`.
4.  ❌ **NEVER** modify `pnpm-lock.yaml` or `package-lock.json` unless explicitly adding a dependency.
