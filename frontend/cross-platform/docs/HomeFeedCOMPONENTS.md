# Home Feed Components

> **Integration Contract**
> This document defines the components used by the Home Feed Screen (`/(tabs)/index`) and their behavior.

---

## PostCard

### 1. Responsibility
*   **Type**: Hybrid (Presentational + Logic).
*   **Purpose**: Displays a single social post summary (Author, Content, Likes, Comments).
*   **Context**: Rendered items in the Feed `FlatList`.

### 2. Usage Context
*   **Used By**: Home Screen (`/(tabs)/index`).
*   **Assumptions**: Passed a `PostDetail` object matching the backend schema.

### 3. Public API (Props Contract)
```ts
interface PostCardProps {
  post: PostDetailType
  accessToken?: string
  isAuthenticated?: boolean
  currentUserId?: string
  onLoginRequired?: () => void
  onPress?: () => void     // Overrides default navigation to detail
  showDoubleTapLike?: boolean // Defaults to true
  style?: ViewStyle
}
```
*   **`onLoginRequired`**: Callback triggered if an unauthenticated user attempts to like.
*   **`showDoubleTapLike`**: Enables/disables the instagram-style heart animation wrapper.

### 4. Internal Logic
*   **Optimistic Like**: Tapping 'Like' immediately updates local state. Reverts on API failure.
*   **Double Tap**: Validates authentication before triggering like. Only *adds* like (does not unlike).
*   **Post Status**:
    *   `pending`: Opacity 0.7, shows "Posting...".
    *   `failed`: Shows "Failed ↺". On press, prompts to **Retry** or **Delete**.
*   **Date Formatting**: Relative time (<24h) or absolute date.

### 5. External Dependencies
*   **`socialService`**: For `toggleLike`.
*   **`useSocial`**: For `retryPost` and `deleteFailedPost`.
*   **`ReportModal`**: Embedded modal for reporting content.

### 7. Component Contract — Do Not Break
*   **MUST** show "Posting..." state if `localStatus === 'pending'`.
*   **MUST** allow retrying failed posts via the status indicator.
*   **MUST** optimistically update valid like actions.

### 8. Refactor Safety Guide
*   **Safe**: Layout of header/interaction bar, styling of text.
*   **Unsafe**: Removing `DoubleTapLike` wrapper, altering `handleDoubleTapLike` logic.

---

## CreatePostModal

### 1. Responsibility
*   **Type**: Smart / Container.
*   **Purpose**: Orchestrates post creation: Input validation, Image selection, Image upload, and Post submission.

### 2. Usage Context
*   **Used By**: Home Screen (triggered by FAB or Header button).

### 3. Public API
```ts
interface CreatePostModalProps {
  visible: boolean
  onClose: () => void
}
```

### 4. Internal Logic
*   **Submission Flow**:
    1.  Validate (Max 2000 chars, max 10 images).
    2.  Upload images to `mediaService` (if any).
    3.  Call `createPost`.
    4.  Close modal.
*   **State Management**: Resets content/images on `visible` change (false -> true).

### 5. External Dependencies
*   **`ImagePicker` (Expo)**: Opens system gallery.
*   **`mediaService`**: Handles file uploads.
*   **`useSocial`**: Provides `createPost`.

### 7. Component Contract
*   **MUST** enforce max 10 images.
*   **MUST** upload all images before creating post entity.
*   **MUST** reset state when reopened.

---

## ImageGalleryEditor

### 1. Responsibility
*   **Type**: UI / Interactive.
*   **Purpose**: Draggable list for reordering selected images and adding captions.

### 2. Usage Context
*   **Used By**: `CreatePostModal`.

### 3. Public API
```ts
interface ImageGalleryEditorProps {
  images: ImageWithMetadata[]
  onImagesChange: (images: ImageWithMetadata[]) => void
  onRemoveImage: (index: number) => void
  maxImages?: number
}
```

### 4. Internal Logic
*   **Drag & Drop**: Uses `react-native-draggable-flatlist`.
*   **Caption Editing**: Opens internal Modal to edit `image.caption`.
*   **Reordering**: Updates `sortOrder` metadata on drag end.

### 5. External Dependencies
*   **`react-native-draggable-flatlist`**: Critical for drag interaction.
