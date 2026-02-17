# Profile Screen Components

> **Integration Contract**
> This document defines the reusable components used by the Profile Screens (`/(tabs)/profile` and `/profile/[id]`).

---

## FollowButton

### 1. Responsibility
*   **Type**: Interactive UI / Action.
*   **Purpose**: Toggles the follow status of a user. Handles authentication checks and API calls.

### 2. Usage Context
*   **Used By**: Public Profile Screen (`/profile/[id]`).
*   **Criticality**: Core social interaction.

### 3. Public API
```ts
interface FollowButtonProps {
  userId: string
  initialIsFollowing?: boolean
  isAuthenticated?: boolean
  accessToken?: string
  onFollowChange?: (isFollowing: boolean) => void
  onLoginRequired?: () => void
  style?: ViewStyle
}
```

### 4. Internal Logic
*   **State**: Tracks local `isFollowing` and `isLoading`.
*   **Optimistic UI**: Updates state immediately. Reverts on error.
*   **Auth Check**: Checks `isAuthenticated` and `accessToken` before action. Calls `onLoginRequired` if missing.
*   **Error Handling**: Specifically handles `401 Unauthorized` by calling `onLoginRequired`. shows Alert for other errors.
*   **Confirmation**: Prompts user before unfollowing (Alert on native, `window.confirm` on web).

### 5. External Dependencies
*   **`socialService`**: Performs `followUser` and `unfollowUser` API calls.

---

## LoginPromptModal

### 1. Responsibility
*   **Type**: Modal / Navigation.
*   **Purpose**: Interstitial modal to prompt unauthenticated users to Log In or Sign Up when they attempt restricted actions.

### 2. Usage Context
*   **Used By**: Public Profile Screen (triggered by `FollowButton`).

### 3. Public API
```ts
interface LoginPromptModalProps {
  visible: boolean
  onClose: () => void
  message?: string
}
```

### 4. Internal Logic
*   **Navigation**:
    *   **Log In**: Closes modal -> Pushes `/(auth)/login`.
    *   **Sign Up**: Closes modal -> Pushes `/(auth)/register`.
    *   **Cancel**: Closes modal.

### 8. Refactor Safety Guide
*   **Safe**:
    *   Updating styles.
    *   Changing the default message.
*   **Unsafe**:
    *   Removing the navigation logic (breaks auth flow).
