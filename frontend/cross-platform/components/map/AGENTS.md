# AGENTS.md - Map Components

## Domain Context
This directory handles Map visualization. It is **CRITICAL** to note the platform divergence:
*   **Native (iOS/Android)**: Uses `@maplibre/maplibre-react-native`.
*   **Web**: Uses `react-leaflet`.

## Component Logic & Rules

### `MapComponent` (.native.tsx / .web.tsx)
*   **Responsibility**: Renders the map, handles user location, and displays markers.
*   **Agent Rule**:
    *   **NEVER** import `maplibre` code in the `.web.tsx` file (it will crash).
    *   **NEVER** import `leaflet` code in the `.native.tsx` file.
    *   Use `.d.ts` to define the common interface.

### `TeleportButton`
*   **Logic**: Floating Action Button (FAB). Triggers the "Teleport" sequence.
*   **Interaction**: On press -> Call `onPress`. Parent handles the animation/API call.

### `VisualMemoryCard` & `Filmstrip`
*   **Logic**: `VisualMemoryCard` is a marker/popup on the map. `Filmstrip` is the bottom carousel.
*   **Sync**: Clicking a card in `Filmstrip` should pan the map to the corresponding `VisualMemoryCard`.

## Coordinate Systems
*   **Standard**: `[longitude, latitude]` (GeoJSON format) is often used by MapLibre.
*   **Leaflet**: Often uses `[latitude, longitude]`.
*   **Agent Rule**: **ALWAYS VERIFY** coordinate order when passing data between services and these components. `Memory` DTO usually uses `latitude`, `longitude` properties explicitly to avoid confusion.
