/**
 * API Types and DTOs
 * 
 * This file defines the standard API response envelope and entity DTOs
 * to decouple component data from API response format.
 */

// Standard API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
  };
}

// Auth DTOs
export interface AuthTokensDto {
  accessToken: string;
}

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  role?: 'user' | 'moderator' | 'admin';
  defaultPrivacy?: 'private' | 'friends' | 'public';
  createdAt?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

// Admin DTOs
export interface SystemStatsDto {
  userCount: number;
  postCount: number;
  activeUsers: number;
  pendingReports: number;
}

export interface ReportDto {
  id: string;
  type: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  reporterId: string;
}

// Error Response
export interface ApiErrorDto {
  statusCode: number;
  message: string;
  error: string;
  timestamp?: string;
  path?: string;
}

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
