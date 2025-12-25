# AGENTS.md - App Directory (Expo Router)

## Domain Context
This directory maps 1:1 to the application URL/Navigation structure using **Expo Router**.

## Routing Rules

### 1. File Structure = Routes
*   `app/index.tsx` -> `/`
*   `app/profile/[id].tsx` -> `/profile/123`
*   `app/(tabs)/_layout.tsx` -> Tabs Navigator

### 2. Group Syntax `(name)`
*   Folders with `()` are **Route Groups**. They do NOT affect the URL path.
*   Used for initializing Stacks or Tabs that shouldn't add to the deep-link path.
*   **Example**: `app/(auth)/login.tsx` is accessed via `/login`, NOT `/auth/login`.

### 3. Layouts `_layout.tsx`
*   Define the navigation UI (Stack, Tabs, Drawer) for the current directory.
*   **Agent Rule**: ALWAYS wrap screens in a valid `_layout` context if they share navigation headers or state.

### 4. Protected Routes
*   Logic usually resides in `app/_layout.tsx` (Root Layout) using `useEffect` and `AuthContext` segment checks.
*   **Agent Rule**: Do not stick auth logic in every screen. Rely on the Root Layout protection or a HOC if strictly needed.

## Common Pitfalls
*   **Navigation Props**: Do NOT use `useNavigation` for pushing routes. Use `router.push('/path')` from `expo-router`.
*   **Params**: Use `useLocalSearchParams()` to get query parameters or dynamic route segments.
