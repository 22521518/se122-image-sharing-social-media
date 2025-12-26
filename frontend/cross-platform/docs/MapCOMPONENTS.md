# Map Screen Components

> **Integration Contract**
> This document defines the components used by the Map Screen (`/(tabs)/map`) and their platform-specific behaviors.

---

## MapComponent

### 1. Responsibility
*   **Type**: Wrapper / Platform-Specific.
*   **Purpose**: Abstraction layer over `react-native-maps` (Native) or `Leaflet` (Web) to provide a unified API for displaying memories and handling interactions.

### 2. Usage Context
*   **Used By**: Map Screen (`/(tabs)/map`).
*   **Criticality**: Core. The app does not function without this.

### 3. Public API (Ref Contract)
```ts
interface MapComponentRef {
  flyTo(region: MapRegion, duration?: number): void
}
```

### 3. Public API (Props Contract)
```ts
interface MapComponentProps {
  initialRegion: MapRegion
  onRegionChangeComplete: (region: MapRegion) => void
  onLongPress: (coordinate: { latitude: number, longitude: number }) => void
  memories: Memory[]
  onMemoryPress: (memory: Memory) => void
  manualPinLocation: { latitude: number, longitude: number } | null
  showTempPin: boolean
  isLoading: boolean
  containerStyle?: StyleProp<ViewStyle>
}
```

### 4. Internal Logic
*   **Region Debounce**: (Handled by parent, but component reports changes).
*   **Viewport Calc**: Calculates `latitudeDelta` based on Zoom Level (Native) or Bounds (Web).

### 6. Platform-Specific Behavior
*   **Native**: Uses `MapLibreGL`. Requires direct manipulation of Camera for `flyTo`.
*   **Web**: Likely uses Leaflet (implied by file structure, not read here).

### 7. Component Contract
*   **MUST** Expose `flyTo` method via Ref.
*   **MUST** Render user location.
*   **MUST** Render memory markers with color coding.

---

## Filmstrip

### 1. Responsibility
*   **Type**: Interactive UI.
*   **Purpose**: Horizontal list of memories visible in the current viewport. Synchronizes with Map selection.

### 2. Usage Context
*   **Used By**: Map Screen (Bottom overlay).

### 3. Public API
```ts
interface FilmstripProps {
  memories: Memory[]
  onMemoryPress: (memory: Memory) => void
  isLoading?: boolean
  selectedMemoryId?: string | null
  onAudioPlay?: (memoryId: string) => void
}

interface FilmstripRef {
  scrollToMemory: (memoryId: string) => void
}
```

### 4. Internal Logic
*   **Audio Sync**: Plays audio via `expo-audio` when a voice memory is pressed.
*   **Highlighting**: Scrolls to and highlights the item corresponding to `selectedMemoryId`.

### 5. External Dependencies
*   **`expo-audio`**: For playback.

---

## TeleportButton

### 1. Responsibility
*   **Type**: Action / Navigation.
*   **Purpose**: Triggers the "Serendipitous Teleportation" flow.
*   **Behavior**: Adapts visual style based on screen width.

### 3. Public API
```ts
interface TeleportButtonProps {
  onPress: () => void
  isLoading?: boolean
  disabled?: boolean
  variant?: 'fab' | 'inline' // Auto-detected if omitted
}
```

### 6. Platform-Specific Behavior
*   **Mobile (<768px)**: Floating Action Button (FAB).
*   **Desktop (>=768px)**: Inline button with label.

---

## ShutterFlash

### 1. Responsibility
*   **Type**: Animation Overlay.
*   **Purpose**: Visual white-out effect during teleportation.

### 4. Internal Logic
*   **Animation**: 0.2s duration. Fade In -> Fade Out keyframes using `react-native-reanimated`.
*   **Callback**: `onFlashComplete` called after fade out.

---

## VoiceRecorder

### 1. Responsibility
*   **Type**: Capture Tool.
*   **Purpose**: Records audio with visual feedback and handles permission requests.

### 4. Internal Logic
*   **Duration Limit**: Auto-stops after 5 seconds.
*   **Min Duration**: Rejects recordings < 1 second.
*   **State Machine**: `Initializing` -> `Recording` -> `Complete`.
*   **Double-tap Protection**: Uses Ref mutexes (`isStartingRef`, `isStoppingRef`) to prevent race conditions.

### 5. External Dependencies
*   **`expo-audio`**: Recording API.
*   **`expo-location`**: Fetches location on start.
*   **`useMemories`**: Checks upload state (blocks recording if uploading).

---

## PhotoPicker

### 1. Responsibility
*   **Type**: Capture / Management Tool.
*   **Purpose**: Selects photos from gallery, extracts EXIF, handles clustering, and manages uploads.

### 3. Public API
```ts
interface PhotoPickerProps {
  onPhotosSelected?: (photos: SelectedPhoto[]) => void
  onConfirmUpload?: (data: UploadData) => Promise<void>
  multiSelect?: boolean
  maxPhotos?: number // Defaults to 9
  showConfirmPanel?: boolean
  uploadState?: MemoryUploadState
}
```

### 4. Internal Logic
*   **Clustering**: Groups photos by time/location (Story 3.3).
*   **Bulk Processing**: Uses Web Worker (on Web) to process EXIF and Hashes off-main-thread.
*   **HEIC Conversion**: Auto-converts HEIC to JPEG if needed.
*   **View Modes**: Toggles between `Grid` and `Cluster` views.

### 5. External Dependencies
*   **`expo-image-picker`**: System gallery access.
*   **`react-dropzone`**: Web drag-and-drop.
*   **Worker**: `utils/worker-factory` for heavy processing.

---

## FeelingSelector

### 1. Responsibility
*   **Type**: Input / UI.
*   **Purpose**: Aesthetic selection of emotional states (`JOY`, `MELANCHOLY`, etc.).

### 3. Public API
```ts
interface FeelingSelectorProps {
  selectedFeeling: Feeling | null
  onFeelingSelect: (feeling: Feeling) => void
  compact?: boolean
}
```

### 4. Internal Logic
*   **Config**: Maps Enum keys to Colors, Icons, and Descriptions.
*   **Layouts**: Renders `Horizontal Scroll` (Compact) or `Grid` (Full).

### 7. Component Contract
*   **MUST** support all 5 defined feelings: `JOY`, `MELANCHOLY`, `ENERGETIC`, `CALM`, `INSPIRED`.
