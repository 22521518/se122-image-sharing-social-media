# AGENTS.md - Components

## Development Rules

### 1. Theming Support (CRITICAL)
*   All atomic components MUST support Light and Dark modes.
*   **Use**: `ThemedText` and `ThemedView` from `./` instead of raw `Text` and `View` where possible.
*   **Colors**: Import from `constants/Colors.ts`, do NOT hardcode hex values like `#fff` or `#000`.

### 2. Platform Agnostic
*   Always verify if a component needs `.web.tsx` and `.native.tsx` split properties (e.g., Maps, Camera).
*   If using a library that is Native-only (like `expo-blur`), enable a fallback for Web.

### 3. Folder Structure
*   **Atomic/Generic**: Place in `components/ui` or root `components/`.
*   **Domain Specific**: Place in `components/social`, `components/map`, etc.
