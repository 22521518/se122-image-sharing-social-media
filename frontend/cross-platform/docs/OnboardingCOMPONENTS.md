# Onboarding Screen Components

> **Integration Contract**
> This document defines the components used by the Onboarding Screen (`/onboarding`) and their strict behavioral requirements.

---

## ThemedView

### 1. Responsibility
*   **Type**: Presentational (Theme-aware).
*   **Purpose**: Provides a `View` that automatically adapts its background color to the system theme (Light/Dark).
*   **Why**: Eliminates manual color logic in the screen component.

### 2. Usage Context
*   **Used By**: Main screen container (`styles.container`).
*   **Criticality**: High (Visual consistency).

### 3. Public API (Props Contract)
```ts
interface ThemedViewProps extends ViewProps {
  lightColor?: string // Optional override for light mode
  darkColor?: string  // Optional override for dark mode
}
```
*   **`lightColor` / `darkColor`**: If omitted, defaults to the system 'background' color.

### 4. Internal Logic
*   **Hook**: Uses `useThemeColor` to resolve final background color based on `useColorScheme()`.

### 5. External Dependencies
*   `useThemeColor` hook.

### 7. Component Contract — Do Not Break
*   **MUST** respond to system theme changes immediately.
*   **MUST** accept standard `ViewProps` (style, children).

### 8. Refactor Safety Guide
*   **Safe**: Changing default background colors in `constants/Colors`.
*   **Unsafe**: Removing `useThemeColor` integration.

---

## ThemedText

### 1. Responsibility
*   **Type**: Presentational (Theme-aware).
*   **Purpose**: Renders text with theme-adaptive colors and standardized typography variants.

### 2. Usage Context
*   **Used By**:
    *   Prompts ("Where did you feel most at home...")
    *   Titles ("Welcome to LifeMapped")
    *   Button labels ("Continue")

### 3. Public API (Props Contract)
```ts
interface ThemedTextProps extends TextProps {
  lightColor?: string
  darkColor?: string
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'
}
```
*   **`type`**: Defaults to `'default'`. content semantics (e.g., `'title'` sets size/weight).

### 4. Internal Logic
*   **Styling**: Merges `color` (from theme) with `type` specific styles (fontSize, fontWeight).

### 7. Component Contract — Do Not Break
*   **MUST** default to `type="default"` if unspecified.
*   **MUST** prioritize `lightColor`/`darkColor` props over default theme colors.

### 8. Refactor Safety Guide
*   **Safe**: Adjusting font sizes/weights in `styles` object within component.
*   **Unsafe**: Removing `type` prop support (breaks visual hierarchy).
