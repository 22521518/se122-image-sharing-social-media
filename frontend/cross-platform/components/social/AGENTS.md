# AGENTS.md - Social Components

## Domain Context
This directory contains UI components for the "Social Feed" domain. These components rely heavily on:
1.  **Optimistic UI Updates**: User actions (like/follow) must display immediately before the API responds.
2.  **Gesture Handling**: Double-taps and complex touch interactions.

## Component Logic & Rules

### `LikeButton`
*   **Logic**: Uses `useMutation` (TanStack Query) or internal state to toggle `isLiked` immediately.
*   **Props**: `itemId` (string), `targetType` ('post' | 'memory').
*   **Agent Rule**: ALWAYS implement rollback on API failure.

### `DoubleTapLike`
*   **Logic**: Wraps children. Detects double-tap gesture to trigger the `onDoubleTap` callback AND shows an animated heart overlay.
*   **Usage**: Wrap `PostCard` images or media content.
*   **Agent Rule**: Ensure `TapGestureHandler` from `react-native-gesture-handler` is used correctly with `numberOfTaps={2}`.

### `CommentList`
*   **Logic**: Displays a list of comments. Should handle deletion internally or via callback.
*   **Agent Rule**: Pagination is critical here if comments are numerous (though currently simple list).

### `ImageGalleryEditor`
*   **Logic**: Used in `CreatePost` screen. Allows selecting, cropping (optional), and arranging images.
*   **Agent Rule**: Must handle URI revocations and temporary cache files carefully.

## Architecture
*   **State**: Components should generally receive data via props, but trigger mutations via `social.service.ts` hooks.
*   **Styling**: Use `StyleSheet.create` or `Constants.Colors`. Avoid inline styles for complex layouts.
