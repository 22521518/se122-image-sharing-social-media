/**
 * API Service
 * 
 * Centralized API client that handles:
 * - Request/response formatting
 * - Response unwrapping
 * - Error handling
 * - Session expiry (401) handling
 */

import { ApiErrorDto, unwrapApiResponse } from '../types/api.types';

const BE_PORT = process.env.EXPO_PUBLIC_API_PORT || 3000;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:${BE_PORT}`;

// Callback for handling authentication failures
let onAuthFailureCallback: (() => void) | null = null;

export class ApiService {
  /**
   * Register a callback to be called when authentication fails (401)
   * This should be called by AuthContext to handle logout
   */
  static setOnAuthFailure(callback: (() => void) | null) {
    onAuthFailureCallback = callback;
  }
  private static getHeaders(token?: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private static handleAuthFailure(response: Response) {
    if (response.status === 401 && onAuthFailureCallback) {
      console.log('Received 401 Unauthorized, triggering auth failure callback');
      // Call the callback asynchronously to avoid blocking the error flow
      setTimeout(() => {
        if (onAuthFailureCallback) {
          onAuthFailureCallback();
        }
      }, 0);
    }
  }

  private static getErrorMessage(error: any, status: number): string {
    // Handle GlobalExceptionFilter structure: { success: false, error: { message: ... } }
    if (error && error.error && typeof error.error.message === 'string') {
      return error.error.message;
    }
    if (error && error.error && Array.isArray(error.error.message)) {
      return error.error.message.join(', ');
    }

    // Handle generic structure
    if (error && typeof error.message === 'string') {
      return error.message;
    }
    if (error && Array.isArray(error.message)) {
      return error.message.join(', ');
    }
    if (error && typeof error.error === 'string') {
      // Sometimes 'error' is just a string at top level in standard NestJS exceptions if filter is bypassed
      return error.error;
    }

    // Fallback: Show the full error string for debugging if all else fails
    return `Status ${status}: ${JSON.stringify(error)}`;
  }

  static async post<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
    token?: string | null,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async get<TResponse>(
    endpoint: string,
    token?: string | null,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(token),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async patch<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
    token?: string | null,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async delete<TResponse>(
    endpoint: string,
    token?: string | null,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async put<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
    token?: string | null,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  /**
   * Upload multipart/form-data (for file uploads)
   * Note: Does not set Content-Type header - let browser set it with boundary
   */
  static async uploadFormData<TResponse>(
    endpoint: string,
    formData: FormData,
    token?: string | null,
  ): Promise<TResponse> {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }

  /**
   * PATCH with multipart/form-data (for file uploads with updates)
   * Note: Does not set Content-Type header - let browser set it with boundary
   */
  static async patchFormData<TResponse>(
    endpoint: string,
    formData: FormData,
    token?: string | null,
  ): Promise<TResponse> {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: formData,
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleAuthFailure(response);
      const error = json as ApiErrorDto;
      throw new Error(this.getErrorMessage(error, response.status));
    }

    return unwrapApiResponse<TResponse>(json);
  }
}
