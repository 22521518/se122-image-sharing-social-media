# Screen Contracts

> **Behavioral and Architectural Contract**
>
> This document defines the non-negotiable behavior, structure, and dependencies for every screen.
> **Refactor with confidence only if you respect these contracts.**

---

## Onboarding Screen (`/onboarding`)

### 1. Purpose
*   **Responsibility**: Collect initial user context (a "memory") and transition user from "New" to "Active" state.
*   **Context**: Reached via redirect from Root Layout or Tab Layout if `!user.hasOnboarded`.
*   **Problem Solved**: Personalized initial experience and data seeding.

### 2. Navigation
*   **Route**: `/onboarding`
*   **Type**: Stack Screen (Full Screen)
*   **Params**: None.
*   **Exits**:
    *   `router.replace('/(tabs)/map')` (On Skip)
    *   `router.replace({ pathname: '/(tabs)/map', params: { onboardingMemory: input } })` (On Continue)

### 3. UI Structure
*   **`KeyboardAvoidingView`**: Wraps entire screen for input handling.
*   **`ThemedView`**: Main container.
*   **`Animated.View`**: Entry animations.
*   **`TextInput`**: "Where did you feel most at home..." prompt.
*   **`TouchableOpacity`**: "Continue" and "Skip" actions.

### 4. Screen Logic

#### State
```ts
const [input, setInput] = useState('') // The user's memory text
const [fadeAnim] = useState(new Animated.Value(0)) // Entry animation
const [slideAnim] = useState(new Animated.Value(50)) // Entry animation
```

#### Effects
*   **Mount**: Plays entry animation (`Animated.parallel`). Tracks `ONBOARDING_STARTED` analytics. Loads saved input from storage.
*   **Input Change**: Debounced save to `AsyncStorage` (`ONBOARDING_INPUT_KEY`) to preserve data if app backgrounds.

#### Handlers
*   **`handleContinue`**: Clears storage, navigates to Map with `onboardingMemory` param.
*   **`handleSkip`**: Clears storage, tracks skip, calls `completeOnboarding`, navigates to Map (no params).

### 5. Data & Reactive Dependencies
*   **`useAuth`**: Requires `completeOnboarding` method.
*   **`useRouter`**: For navigation replacement.
*   **`useColorScheme`**: For dynamic styling of the input field.
*   **`AsyncStorage`**: Depends on `ONBOARDING_INPUT_KEY` for persistence.
*   **`analytics`**: Service for tracking drop-off.

### 6. Platform-Specific Behavior
*   **Keyboard**: `KeyboardAvoidingView` uses `padding` on iOS and `height` on Android.

### 7. Screen Contract — Do Not Break
*   **MUST** call `completeOnboarding()` before leaving (except if user kills app).
*   **MUST** pass `onboardingMemory` param to Map if user provided input.
*   **MUST** persist input to `AsyncStorage` to prevent data loss on backgrounding.

### 8. Design Refactor Safety
*   **Safe**: Changing animations, layout of text/inputs, styling colors.
*   **Unsafe**: Removing `completeOnboarding` call, changing navigation target (`/(tabs)/map`), removing `AsyncStorage` logic.

---

## Modal Screen (`/modal`)

### 1. Purpose
*   **Responsibility**: Generic informational modal (Placeholder/Template).
*   **Context**: Opened via stack presentation `'modal'`.

### 2. Navigation
*   **Route**: `/modal`
*   **Type**: Stack Screen (Modal Presentation)
*   **Exits**: `Link` with `dismissTo`.

### 3. UI Structure
*   **`ThemedView`**: Container.
*   **`Link`**: Dismiss action.

### 7. Screen Contract — Do Not Break
*   Must be dismissible.

---

## Login Screen (`/(auth)/login`)

### 1. Purpose
*   **Responsibility**: User authentication via Email/Password or Google.
*   **Context**: Default entry for unauthenticated users (via redirects).

### 2. Navigation
*   **Route**: `/(auth)/login`
*   **Type**: Stack Screen
*   **Exits**:
    *   `router.replace('/(tabs)')` (On Success)
    *   `Link` to `/(auth)/register` (Sign Up)
    *   External Browser / Deep Link (Google Auth)

### 3. UI Structure
*   **`KeyboardAvoidingView`**: Wrapper.
*   **`TextInput`**: Email & Password fields.
*   **`TouchableOpacity`**: Submit and Google Sign-in buttons.
*   **`Link`**: Navigation to Register.

### 4. Screen Logic
#### State
```ts
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [isLoading, setIsLoading] = useState(false)
```

#### Handlers
*   **`handleLogin`**: Validates input -> calls `auth.login` -> redirects to `/(tabs)`.
*   **`handleGoogleSignIn`**:
    *   **Web**: Redirects `window.location`.
    *   **Mobile**: Calls `Linking.openURL` with API endpoint + `state=mobile`.

### 5. Data Dependencies
*   **`useAuth`**: `login` method.
*   **`EXPO_PUBLIC_API_URL`**: Required for constructing Google Auth URL.

### 6. Platform-Specific Behavior
*   **Google Auth**: Diverges completely between Web (window redirect) and Native (Deep linking).

### 7. Screen Contract
*   **MUST** redirect to `/(tabs)` on successful email login.
*   **MUST** construct valid `state` param for Google OAuth to ensure callback works.

---

## Register Screen (`/(auth)/register`)

### 1. Purpose
*   **Responsibility**: Create new user account.

### 2. Navigation
*   **Route**: `/(auth)/register`
*   **Type**: Stack Screen
*   **Exits**: `router.replace('/(tabs)')` (On Success).

### 4. Screen Logic
*   **Validation**: Checks email format, password length (>8), and password match.
*   **Handler**: Calls `auth.register` -> redirects to `/(tabs)`.

### 7. Screen Contract
*   **MUST** validate password confirmation before submission.
*   **MUST** redirect to `/(tabs)` on success.

---

## Home Feed Screen (`/(tabs)/index`)

### 1. Purpose
*   **Responsibility**: Main social feed. Displays posts from followed users and self.
*   **Context**: Primary tab.

### 2. Navigation
*   **Route**: `/(tabs)/index` (index route of tabs)
*   **Type**: Tab Screen
*   **Exits**:
    *   Create Post: Sets `showCreatePost(true)` (Internal Modal) or FAB.
    *   Login: `router.push('/(auth)/login')` (if unauthenticated).

### 3. UI Structure
*   **`SafeAreaView`**: Container.
*   **`FlatList`**: The Feed.
    *   Item: `<PostCard />`
    *   Footer: `<ActivityIndicator />`
    *   Empty: Custom View.
*   **`<CreatePostModal />`**: Internal modal component.
*   **FAB**: `TouchableOpacity` (bottom-right).

### 4. Screen Logic
#### State
```ts
const { posts, isLoading, hasMore } = useSocial()
const [isRefreshing, setIsRefreshing] = useState(false)
const [showCreatePost, setShowCreatePost] = useState(false)
```
#### Effects
*   **Mount/Auth Change**: calls `refreshPosts()` if authenticated.

#### Handlers
*   **`onRefresh`**: Calls `refreshPosts` and manages refreshing state.
*   **`onEndReached`**: Calls `loadMorePosts` when threshold (0.5) is hit.

### 5. Data Dependencies
*   **`useSocial`**: **CRITICAL**. Provides `posts` array, pagination logic (`loadMorePosts`), and `refreshPosts`.
*   **`useAuth`**: User state for feed filtering/permissions.

### 7. Screen Contract
*   **MUST** support Infinite Scroll (`onEndReached`).
*   **MUST** support Pull-to-Refresh (`RefreshControl`).
*   **MUST** show empty state if `posts.length === 0`.
*   **MUST** hide FAB if unauthenticated? (Currently shows prompt instead).

### 8. Design Refactor Safety
*   **Safe**: Feed item visual design, header styling.
*   **Unsafe**: Removing `FlatList`, changing `onEndReachedThreshold`, decoupling `useSocial`.

---

## Map Screen (`/(tabs)/map`)

### 1. Purpose
*   **Responsibility**: Spatial discovery. View memories on map, capture new memories, "Teleport" exploration.
*   **Context**: Tab Screen.

### 2. Navigation
*   **Route**: `/(tabs)/map`
*   **Params**: `onboardingMemory?: string` (From Onboarding).
*   **Exits**:
    *   Postcards: `router.push('/postcards/create')`.
    *   Detail: `MemoryDetailModal` (Internal).

### 3. UI Structure
*   **`MapComponent`**: Platform-agnostic wrapper (Native: MapLibre, Web: Leaflet).
*   **`ShutterFlash`**: Full-screen animation overlay.
*   **`Filmstrip`**: Horizontal memory list (Desktop/Bottom).
*   **`TeleportButton`**: FAB or Header button.
*   **`BottomSheet` (Mobile)**: Capture controls and list.
*   **Action Panels**: Overlays for "Photo Confirm", "Feeling Pin", "Voice Rec".

### 4. Screen Logic
#### State
*   `currentRegion`: Tracks map center/zoom.
*   `captureMode`: 'voice' | 'photo' | 'feeling'.
*   `activePanel`: UI state for capture flows.
*   `manualPinLocation`: Coordinates for dropped pins.
*   `detailMemory`: Controls the `MemoryDetailModal`.

#### Effects
*   **Onboarding Param**: Checks `params.onboardingMemory`. If present -> Sets mode to 'feeling' -> Triggers `handleDropFeelingPin`.
*   **Teleport**: `handleTeleport` triggers a sequence: Flash -> Camera FlyTo -> Open Detail.

### 5. Data Dependencies
*   **`useMemories`**: Upload logic (`uploadVoice`, `uploadPhoto`, `uploadFeeling`) and Map Markers (`mapMemories`).
*   **`useMapViewport`**: Debounced bounding-box queries (`onRegionChange`).
*   **`useTeleport`**: Algorithm to find random memory.
*   **`Location` (Expo)**: Required for "Drop Pin Here" and current location.

### 6. Platform-Specific Behavior
*   **Mobile**: Uses `BottomSheet` and `GestureHandlerRootView`.
*   **Desktop**: Uses Sidebar/Panel layout (`isWideScreen`). Map component implementation differs totally.

### 7. Screen Contract
*   **MUST** debounce map region updates (500ms) to prevent API spam.
*   **MUST** handle `onboardingMemory` param by initiating creation flow immediately.
*   **MUST** sequence Teleport animation correctly (Flash visible -> Move Map -> Show Detail).

---

## Explore Screen (`/(tabs)/explore`)

### 1. Purpose
*   **Responsibility**: Discover content via Search (Users, Tags, Posts) and Trending feed.

### 2. Navigation
*   **Route**: `/(tabs)/explore`
*   **Type**: Tab Screen.
*   **Exits**:
    *   Profile: `/profile/[id]`
    *   Post: `/post/[id]`

### 3. UI Structure
*   **Search Bar**: Top input.
*   **Tabs**: (Top/Accounts/Tags/Posts) - visible only in search user mode.
*   **`FlatList`**: Grid for Trending, List for Search Results.

### 4. Screen Logic
*   **Debounce**: Search query is debounced by 300ms.
*   **Search Mode**: Activates when query length >= 2.
*   **Trending**: Loads on mount.

### 5. Data Dependencies
*   **`socialService.getTrending()`**: Initial content.
*   **`socialService.search()`**: Search execution.

### 7. Screen Contract
*   **MUST** debounce search network requests.
*   **MUST** navigate to `/profile/[id]` (not `/(tabs)/profile`) for other users.

---

## Profile Screen (Self) (`/(tabs)/profile`)

### 1. Purpose
*   **Responsibility**: View and Edit current user's profile. Settings access.
*   **Context**: Tab Screen (Protected).

### 2. Navigation
*   **Route**: `/(tabs)/profile`
*   **Exits**:
    *   Logout -> `/(auth)/login`.

### 3. UI Structure
*   **`ScrollView`**: Main container.
*   **`TextInput`**: Editable Name/Bio fields.
*   **`FollowButton`**: (Not present on self profile? Code logic suggests this is strictly management).

### 5. Data Dependencies
*   **`useUserProfile`**: Fetches and Updates profile data.
*   **`useAuth`**: For `logout()`.

### 7. Screen Contract
*   **MUST** sync local input state with `profile` data on load.
*   **MUST** disable inputs while `isSaving`.

---

## Settings Screen (`/(tabs)/settings`)

### 1. Purpose
*   **Responsibility**: Privacy configuration and Account Deletion.

### 4. Screen Logic
*   **Privacy Toggle**: Updates default privacy level ('private' | 'friends' | 'public').
*   **Delete Account**: Triggers permanent deletion.

### 5. Data Dependencies
*   **`useUserSettings`**: Hook for all logic.

---

## Create Post Screen (`/post/create`)

### 1. Purpose
*   **Responsibility**: Compose text/media posts.
*   **Context**: Stack Screen (often presented modally).

### 2. Navigation
*   **Route**: `/post/create`
*   **Exits**: `router.back()` (Cancel or Success).

### 4. Screen Logic
#### State
*   `content`: Text body.
*   `images`: Array of `ImageWithMetadata`.
*   `privacy`: Selection.

#### Drafts
*   **Auto-save**: `setInterval` (30s) saves to `AsyncStorage`.
*   **Restore**: Loads from `AsyncStorage` on mount.

#### Hashtags
*   **Rendering**: Custom logic splitting text by `/(#\w+)/` to render blue text nodes.

### 5. Data Dependencies
*   **`useSocial.createPost`**: Optimistic submission.
*   **`mediaService`**: Uploads images before post creation.

### 7. Screen Contract
*   **MUST** allow max 10 images.
*   **MUST** clear draft on successful submission.
*   **MUST** upload all media first, then create post with IDs.

---

## Post Detail Screen (`/post/[id]`)

### 1. Purpose
*   **Responsibility**: View single post, comments, and interactions.

### 2. Navigation
*   **Route**: `/post/[id]`
*   **Params**: `id` (Post ID).

### 3. UI Structure
*   **`CommentList`**: Main scrollable component (handles the list).
*   **`ListHeaderComponent`**: Contains the Post content itself.
*   **`CommentInput`**: Fixed at bottom.

### 5. Data Dependencies
*   **`socialService.getPost`**: Fetch detail.
*   **`socialService.createComment`**: Submit comment.

### 7. Screen Contract
*   **MUST** use `CommentList` with `ListHeaderComponent` to avoid "VirtualizedLists nested inside ScrollView" errors.
*   **MUST** optimistically add comments to the list ref via `addComment`.

---

## Create Postcard Screen (`/postcards/create`)

### 1. Purpose
*   **Responsibility**: distinct flow for creating time/geo-locked messages.

### 2. Navigation
*   **Route**: `/postcards/create`
*   **Exits**: `router.back()`.

### 4. Screen Logic
*   **Unlock Type**: Toggles between Date (Days picker) and Location (Radius picker).
*   **Recipient**: Can be Self (null) or a Friend (selected via Modal).

### 7. Screen Contract
*   **MUST** require either Message OR Image.
*   **MUST** validate unlocking condition (e.g. required location if type=location).

---

## Postcard Viewer Screen (`/postcards/[id]`)

### 1. Purpose
*   **Responsibility**: Reveal the postcard content.
*   **Unlock Logic**: Handles the "Envelope" animation and Locked/Unlocked states.

### 4. Screen Logic
*   **Animation**: `envelopeRotate` (Flip), `contentOpacity` (Fade In).
*   **Shake**: If user taps a LOCKED card, it shakes (`lockShake`).

### 5. Data Dependencies
*   **`postcardsService.getPostcard`**: Fetches status (`LOCKED` | `UNLOCKED`).

### 7. Screen Contract
*   **MUST** play Reveal Animation ONLY if status is `UNLOCKED` and `!hasRevealed`.
*   **MUST** show "Locked" state if `status === 'LOCKED'` (unless user is sender, then show preview).

---

## Public Profile Screen (`/profile/[id]`)

### 1. Purpose
*   **Responsibility**: View other users.
*   **Context**: Reached from Explore or Feed.

### 4. Screen Logic
*   **Redirect**: If `id === currentUserId`, redirects to `/(tabs)/profile`.

### 7. Screen Contract
*   **MUST** redirect to self-profile if own ID is passed.
*   **MUST** show `FollowButton` for others.

---

## Memory Detail Screen (`/memory/[id]`)

### 1. Purpose
*   **Responsibility**: Deep-linkable wrapper for Memory Detail.
*   **Context**: `router.push('/memory/123')`.

### 3. UI Structure
*   Wraps `MemoryDetailModal` but forces `visible={true}`.

### 7. Screen Contract
*   **MUST** handle deep linking loading state.
