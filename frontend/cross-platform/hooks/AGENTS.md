# AGENTS.md - Hooks

## Rules

### 1. Naming
*   MUST start with `use`.
*   Example: `useUserProfile`, `useTeleport`.

### 2. Composition
*   Hooks should encapsulate logic that combines state and effects.
*   **Avoid** massive "God Hooks" that do everything. Split by feature.

### 3. Platform Specifics
*   If a hook relies on a Native API, use `.web.ts` and `.ts` (or `.native.ts`) extensions.
*   Example: `use-color-scheme.ts`.
