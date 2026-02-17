# Shared Components

> **Integration Contract**
> This document defines the reusable, cross-cutting components used throughout the application.

---

## ThemedText

### 1. Responsibility
*   **Type**: Primitive / Typography.
*   **Purpose**: Renders text with theme-aware colors (light/dark mode) and predefined typography styles.
*   **Location**: `components/themed-text.tsx`.

### 2. Usage Context
*   **Used By**: All Screens.
*   **Criticality**: Core. Standardizes typography and theming.

### 3. Public API
```ts
interface ThemedTextProps extends TextProps {
  lightColor?: string
  darkColor?: string
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'
}
```

### 4. Component Contract
*   **Theming**: Must automatically adapt to system color scheme using `useThemeColor`.

---

## ThemedView

### 1. Responsibility
*   **Type**: Primitive / Layout.
*   **Purpose**: Renders a View with theme-aware background colors.
*   **Location**: `components/themed-view.tsx`.

### 2. Usage Context
*   **Used By**: Onboarding, Settings, Generic Layouts.
*   **Criticality**: Core. Standardizes container backgrounds.

### 3. Public API
```ts
interface ThemedViewProps extends ViewProps {
  lightColor?: string
  darkColor?: string
}
```

---

## IconSymbol

### 1. Responsibility
*   **Type**: Primitive / Iconography.
*   **Purpose**: Wrapper around SF Symbols (iOS) and MaterialIcons (Android/Web) to provide unified icon rendering.
*   **Location**: `components/ui/icon-symbol.tsx`.

### 2. Usage Context
*   **Used By**: Tabs, Navigation, Buttons.
*   **Criticality**: High. Ensures consistent cross-platform iconography.

### 3. External Dependencies
*   **`expo-symbols`**: iOS implementation.
*   **`@expo/vector-icons`**: Android/Web implementation (MaterialIcons).

---

## ParallaxScrollView

### 1. Responsibility
*   **Type**: Layout / Scrollable.
*   **Purpose**: Provides a ScrollView with a parallax header image effect.
*   **Location**: `components/parallax-scroll-view.tsx`.

### 2. Usage Context
*   **Used By**: Home Screen (legacy), some Detail screens.
*   **Criticality**: Medium. Presentational enhancement.

### 3. Public API
```ts
interface Props {
  headerImage: ReactElement
  headerBackgroundColor: { dark: string; light: string }
  children: ReactNode
}
```

### 4. Internal Logic
*   **Animation**: Uses `react-native-reanimated` to scale/translate the header image on scroll.

---

## LoginPromptModal

### 1. Responsibility
*   **Type**: Modal / Auth Gate.
*   **Purpose**: Common interstitial for gatekeeping authenticated actions (e.g., following, commenting, liking).
*   **Location**: `components/common/LoginPromptModal.tsx`.

### 2. Usage Context
*   **Used By**: Profile, Post Detail, Map (future).
*   **Criticality**: High. Conversion point for guest users.

### 3. Public API
```ts
interface LoginPromptModalProps {
  visible: boolean
  onClose: () => void
  message?: string
}
```
