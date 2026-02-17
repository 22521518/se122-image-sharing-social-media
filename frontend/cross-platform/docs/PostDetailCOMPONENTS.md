# Post Detail Screen Components

> **Integration Contract**
> This document defines the components used by the Post Detail Screen (`/post/[id]`).

---

## CommentList

### 1. Responsibility
*   **Type**: Complex List / Data Container.
*   **Purpose**: Fetches, displays, and manages comments for a post or memory. Handles deletion and optimistic updates.

### 2. Usage Context
*   **Used By**: Post Detail Screen (`/post/[id]`).
*   **Criticality**: Core. Primary user engagement driver.

### 3. Public API
```ts
interface CommentListProps {
  itemId: string
  targetType?: 'post' | 'memory'
  accessToken?: string
  currentUserId?: string
  isAuthenticated?: boolean
  onLoginRequired?: () => void
  onCommentCountChange?: (count: number) => void
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null
}

interface CommentListHandle {
  addComment: (comment: Comment) => void
  scrollToEnd: () => void
}
```

### 4. Internal Logic
*   **Fetching**: Loads comments on mount or id change.
*   **Optimistic UI**: Deletes comments from list immediately; rollbacks on error.
*   **Ref API**: Exposes `addComment` to allow parent (Input) to inject new comments optimistically.

### 5. External Dependencies
*   **`socialService`**: `getComments`, `getMemoryComments`, `deleteComment`.
*   **`ReportModal`**: Integrated for reporting comments.

---

## CommentInput

### 1. Responsibility
*   **Type**: Form / Input.
*   **Purpose**: Input field for composing new comments.

### 2. Usage Context
*   **Used By**: Post Detail Screen (Sticky Bottom).

### 3. Public API
```ts
interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  isAuthenticated?: boolean
  onLoginRequired?: () => void
  placeholder?: string
  style?: ViewStyle
  maxLength?: number
}
```

### 4. Internal Logic
*   **State**: Local `content` and `isSubmitting`.
*   **Validation**: Disables submit if empty or over char limit.
*   **Auth Check**: Calls `onLoginRequired` if not authenticated.

---

## LikeButton

### 1. Responsibility
*   **Type**: Interactive Action.
*   **Purpose**: Toggles like status for posts or memories with animation.

### 2. Usage Context
*   **Used By**: Post Detail Screen, PostCard (Home Feed).

### 3. Public API
```ts
interface LikeButtonProps {
  itemId: string
  targetType?: 'post' | 'memory'
  initialLiked?: boolean
  initialCount?: number
  isAuthenticated?: boolean
  accessToken?: string
  onLikeChange?: (liked: boolean, count: number) => void
  onLoginRequired?: () => void
  style?: ViewStyle
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean
}
```

### 4. Internal Logic
*   **Animation**: `Animated.sequence` (Scale Bounce) + `Animated.timing` (Color).
*   **Optimistic UI**: Updates state immediately; rollbacks on error.
*   **Auth Check**: Blocks action and calls callback if not authenticated.
*   **Targeting**: Supports both 'post' and 'memory' types via `socialService`.

### 5. External Dependencies
*   **`socialService`**: `toggleLike`, `toggleLikeMemory`.
