/**
 * API Service
 * 
 * Centralized API client that handles:
 * - Request/response formatting
 * - Response unwrapping
 * - Error handling
 */

import { ApiResponse, ApiErrorDto, unwrapApiResponse } from '../types/api.types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export class ApiService {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
  }

  static getToken(): string | null {
    return this.token;
  }

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
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
      const error = json as ApiErrorDto;
      throw new Error(error.message || `Request failed with status ${response.status}`);
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
      const error = json as ApiErrorDto;
      throw new Error(error.message || `Request failed with status ${response.status}`);
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
      const error = json as ApiErrorDto;
      throw new Error(error.message || `Request failed with status ${response.status}`);
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
      const error = json as ApiErrorDto;
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return unwrapApiResponse<TResponse>(json);
  }
}
