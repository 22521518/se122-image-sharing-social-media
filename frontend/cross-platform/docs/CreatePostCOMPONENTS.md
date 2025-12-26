# Create Post Screen Components

> **Integration Contract**
> This document defines the components used by the Create Post Screen (`/post/create`).

---

## ImageGalleryEditor

### 1. Responsibility
*   **Type**: Complex Editor / UI.
*   **Purpose**: Manages the list of selected images, allowing drag-and-drop reordering, caption editing, and removal.
*   **Source**: `components/social/ImageGalleryEditor.tsx`.

### 2. Usage Context
*   **Used By**: Create Post Screen (`/post/create`), Create Post Modal (Home Feed).
*   **Criticality**: Core. Essential for the "Rich Post" feature set.

### 3. Public API
```ts
interface ImageGalleryEditorProps {
  images: ImageWithMetadata[]
  onImagesChange: (images: ImageWithMetadata[]) => void
  onRemoveImage: (index: number) => void
  maxImages?: number
}

interface ImageWithMetadata {
  uri: string
  mimeType?: string
  caption?: string
  sortOrder: number
}
```

### 4. Internal Logic
*   **Drag & Drop**: Uses `react-native-draggable-flatlist`.
*   **Caption Editing**: Opens a local Modal to edit the `caption` field of an image.
*   **Reordering**: Updates `sortOrder` based on list position.

### 5. External Dependencies
*   **`react-native-draggable-flatlist`**: Heavy dependency for list interactions.

---

## Inline Logic (Future Refactors)

> These are functional blocks currently implemented inline that are candidates for extraction.

### Hashtag Highlighting
*   **Current Impl**: `Text` component using `suppressHighlighting` and regex splitting behind a transparent `TextInput`.
*   **Risk**: Synchronizing the overlay text with the input state is brittle.

### Privacy Selector
*   **Current Impl**: Simple toggle state (`public` -> `private` -> `friends`).
*   **Risk**: Logic is simple, but UI is hardcoded.

### Draft Management
*   **Current Impl**: `AsyncStorage` calls in `useEffect`.
*   **Risk**: Logic works but is tightly coupled to the screen's state shape.
