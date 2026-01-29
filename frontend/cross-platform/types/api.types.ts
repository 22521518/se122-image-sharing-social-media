/**
 * API Types and DTOs
 *
 * This file defines the standard API response envelope and entity DTOs
 * to decouple component data from API response format.
 *
 * @see docs/API_DATA_CONTRACTS.md for backend contract definitions
 */

// =============================================================================
// Standard API Response Wrapper
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
  };
}

// =============================================================================
// Auth DTOs
// =============================================================================

export interface AuthTokensDto {
  accessToken: string;
  user?: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  defaultPrivacy?: 'private' | 'friends' | 'public';
  hasOnboarded?: boolean;
  createdAt?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
}

// =============================================================================
// Error Response
// =============================================================================

export interface ApiErrorDto {
  statusCode: number;
  message: string;
  error: string;
  timestamp?: string;
  path?: string;
}

// =============================================================================
// Social DTOs (aligned with API_DATA_CONTRACTS.md)
// =============================================================================

/** Author info embedded in posts and comments */
export interface Author {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

/** Extended author with username for profile display */
export interface AuthorWithUsername extends Author {
  username?: string;
}

/** Comment entity - GET /api/social/comments/:targetId */
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  author: Author;
}

/** Media item from backend */
export interface MediaItem {
  id: string;
  url: string;
  type: string;
  caption?: string | null;
  sortOrder?: number | null;
}

/** Post detail - GET /api/social/posts/:id */
export interface PostDetail {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  author: AuthorWithUsername;
  // Media from backend API
  media?: MediaItem[];
  // Computed field for UI convenience
  imageUrls?: string[];
  isLiked?: boolean; // Alias for liked (backwards compat)
  privacy: string;
}

/** Feed response - GET /api/social/feed */
export interface FeedResponse {
  posts: PostDetail[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** User in search results */
export interface UserSearchResult {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

/** Alias for backwards compatibility */
export type SearchUser = UserSearchResult;

/** Hashtag in search results */
export interface HashtagResult {
  id: string;
  tag: string;
  postCount: number;
}

/** Alias for backwards compatibility */
export type SearchHashtag = HashtagResult;

/** Privacy level for posts */
export type PrivacyLevel = 'private' | 'friends' | 'public';

/** Search response - GET /api/social/search */
export interface SearchResponse {
  users: UserSearchResult[];
  posts: PostDetail[];
  hashtags: HashtagResult[];
}

/** Like toggle response */
export interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
}

/** Like status response */
export interface LikeStatusResponse {
  liked: boolean;
  likeCount: number;
}

/** Create comment response */
export interface CreateCommentResponse {
  comment: Comment;
  commentCount: number;
}

/** Delete comment response */
export interface DeleteCommentResponse {
  success: boolean;
  commentCount: number;
}

/** Get comments response */
export interface GetCommentsResponse {
  comments: Comment[];
  count: number;
}

// =============================================================================
// User/Profile DTOs (aligned with API_DATA_CONTRACTS.md)
// =============================================================================

/** User profile - GET /api/users/profile */
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  defaultPrivacy?: string;
  hasOnboarded?: boolean;
  createdAt?: string;
  // Extended fields for profile display
  username?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  friendCount?: number;
  memoryCount?: number;
  // Follow status (from public-profile endpoint)
  isFollowing?: boolean;
  isAuthenticated?: boolean;
}

/** User settings - GET /api/users/settings */
export interface UserSettings {
  defaultPrivacy: string;
  privacySettings: Record<string, unknown> | null;
}

/** Update profile request */
export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

/** Update settings request */
export interface UpdateSettingsDto {
  defaultPrivacy?: string;
  privacySettings?: Record<string, unknown>;
}

// =============================================================================
// Memory DTOs (aligned with API_DATA_CONTRACTS.md)
// =============================================================================

export type MemoryType = 'voice' | 'photo' | 'mixed' | 'text_only';
export type MemoryPrivacy = 'private' | 'friends' | 'public';
export type MemoryFeeling = 'JOY' | 'MELANCHOLY' | 'ENERGETIC' | 'CALM' | 'INSPIRED';
export type Feeling = MemoryFeeling; // Alias for shared components
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Memory placeholder metadata for CSS rendering */
export interface PlaceholderMetadata {
  gradientId: string;
  feeling: string;
  timeOfDay: TimeOfDay;
  capturedAt?: string;
}

/** Memory entity - GET /api/memories */
export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  mediaUrl: string | null;
  duration?: number;
  latitude: number;
  longitude: number;
  privacy: MemoryPrivacy;
  title?: string;
  feeling?: MemoryFeeling;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  placeholderMetadata?: PlaceholderMetadata;
  user?: Author;
}

// =============================================================================
// Postcard DTOs (aligned with API_DATA_CONTRACTS.md)
// =============================================================================

export type PostcardStatus = 'DRAFT' | 'LOCKED' | 'UNLOCKED';
export type RecipientType = 'SELF' | 'FRIEND' | 'GROUP';
export type UnlockType = 'DATE' | 'LOCATION' | 'DATE_AND_LOCATION';

/** Postcard entity - GET /api/postcards/:id */
export interface Postcard {
  id: string;
  senderId: string;
  recipientId: string;
  status: PostcardStatus;
  message?: string;
  mediaUrl?: string;
  unlockDate?: string;
  unlockLatitude?: number;
  unlockLongitude?: number;
  unlockRadius?: number;
  unlockPlace?: string;
  viewedAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

/** Create postcard request (legacy interface) */
export interface CreatePostcardRequest {
  recipientId: string;
  recipientType: RecipientType;
  message?: string;
  imageUrl?: string;
  unlockType: UnlockType;
  unlockDate?: string;
  unlockPlace?: string;
  unlockLatitude?: number;
  unlockLongitude?: number;
}

/** Create postcard request */
export interface CreatePostcardDto {
  message?: string;
  mediaUrl?: string;
  recipientId?: string;
  unlockDate?: string;
  unlockLatitude?: number;
  unlockLongitude?: number;
  unlockRadius?: number;
}

// =============================================================================
// Moderation DTOs (aligned with API_DATA_CONTRACTS.md)
// =============================================================================

export type TargetType = 'POST' | 'COMMENT' | 'USER' | 'MEMORY';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

/** Create report request */
export interface CreateReportDto {
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  blockUser?: boolean;
}

/** Report response - POST /api/moderation/reports */
export interface ReportResponse {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  message: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper function to unwrap API response
 * Handles both wrapped { success, data, meta } and direct responses
 */
export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}
