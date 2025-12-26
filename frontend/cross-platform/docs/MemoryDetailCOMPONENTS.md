# Memory Detail Components

> **Integration Contract**
> This document defines the components used for displaying Memory Details and representations (`/memory/..` context).

---

## MemoryDetailModal

### 1. Responsibility
*   **Type**: Layout / Screen Overlay.
*   **Purpose**: Displays the full details of a memory (photo/voice/text) in a modal overlay. Handles audio playback, liking, and commenting.

### 2. Usage Context
*   **Used By**: Map Screen (`MapComponent`, `Filmstrip`).
*   **Criticality**: Core. The primary way to consume content on the map.

### 3. Public API
```ts
interface MemoryDetailModalProps {
  visible: boolean
  memory: Memory | null
  onClose: () => void
  onLoginRequired?: () => void
  autoPlay?: boolean
}
```

### 4. Internal Logic
*   **Audio**: Uses `expo-audio` (`useAudioPlayer`). Auto-plays if `autoPlay` is true. Pauses on close.
*   **DoubleTap**: Implements `DoubleTapLike` wrapping main content.
*   **Optimistic UI**: Handling matches standard social patterns (optimistic updates, rollback on error).

### 5. External Dependencies
*   **`expo-audio`**: Critical dependency for voice memories.
*   **`DoubleTapLike`**: Wrapper.
*   **`LikeButton`, `CommentList`, `CommentInput`**: Reused social components.

---

## MemoryCard

### 1. Responsibility
*   **Type**: List Item / Map Marker Content.
*   **Purpose**: Renders the "Pin" or "Card" representation of a memory on the map or in a list. Uses abstract art/gradients based on `feeling`.

### 2. Usage Context
*   **Used By**: Map Component (as Marker view), Lists.

### 3. Public API
```ts
interface MemoryCardProps {
  id: string
  type: 'voice' | 'photo' | 'mixed' | 'text_only'
  mediaUrl?: string | null
  title?: string | null
  feeling?: Feeling | null
  placeholderMetadata?: PlaceholderMetadata | null
  latitude: number
  longitude: number
  createdAt: string
  onPress?: () => void
  compact?: boolean
}
```

### 4. Internal Logic
*   **Generative Art**: Selects gradient colors based on `placeholderMetadata.gradientId` or `feeling` to render abstract circle decor.
*   **Compact Mode**: Supports a smaller layout (condensed visual container).
*   **Feeling Mapping**: Maps internal `Feeling` enum to colors and icons using `FeelingSelector` logic.

### 5. External Dependencies
*   **`expo-linear-gradient`**: Required for the background art.

---

## VisualMemoryCard

### 1. Responsibility
*   **Type**: List Item (Carousel).
*   **Purpose**: Renders a vertical "Filmstrip" style card for a memory.

### 2. Usage Context
*   **Used By**: Filmstrip (Map Screen).

### 3. Public API
```ts
interface VisualMemoryCardProps {
  memory: Memory
  onPress: (memory: Memory) => void
}
```

### 4. Internal Logic
*   **Styling**: Fixed dimensions (`CARD_WIDTH`, `CARD_HEIGHT`) relative to screen width.
*   **Feeling Color**: Applies a feeling-based tint color to overlays.

### 5. External Dependencies
*   **`expo-image`**: Used for optimized image rendering.
