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
