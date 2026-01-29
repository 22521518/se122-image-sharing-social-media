/**
 * API Service
 * 
 * Centralized API client that handles:
 * - Request/response formatting
 * - Response unwrapping
 * - Error handling
 * - Global 401 unauthorized handling
 */

import { ApiErrorDto, unwrapApiResponse } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export class ApiService {
  private static token: string | null = null;
  private static onUnauthorizedCallback: (() => void) | null = null;

  static setToken(token: string | null) {
    this.token = token;
  }

  static getToken(): string | null {
    return this.token;
  }

  /**
   * Register a callback to be invoked when any API call returns 401 Unauthorized
   * This allows the app to auto-logout when session expires
   */
  static setOnUnauthorized(callback: (() => void) | null) {
    this.onUnauthorizedCallback = callback;
  }

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Cache-busting headers to ensure fresh data
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Handle response and throw appropriate errors
   * Also triggers onUnauthorized callback for 401 responses
   */
  private static handleErrorResponse(response: Response, json: unknown): void {
    if (response.status === 401) {
      // Session expired or invalid - trigger unauthorized handler
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }
    }
    const error = json as ApiErrorDto;
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  static async post<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleErrorResponse(response, json);
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async get<TResponse>(endpoint: string): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleErrorResponse(response, json);
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async patch<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleErrorResponse(response, json);
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async put<TRequest, TResponse>(
    endpoint: string,
    body: TRequest,
  ): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleErrorResponse(response, json);
    }

    return unwrapApiResponse<TResponse>(json);
  }

  static async delete<TResponse>(endpoint: string): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok) {
      this.handleErrorResponse(response, json);
    }

    return unwrapApiResponse<TResponse>(json);
  }
}
