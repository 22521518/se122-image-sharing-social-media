/**
 * Auth Service for Web Console
 * Handles admin/moderator authentication
 */

import { ApiService } from './api.service';

interface LoginResponse {
  accessToken: string;
  role: string;
}

interface AdminUserInfo {
  id: string;
  email: string;
  role: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await ApiService.post<{ email: string; password: string }, LoginResponse>(
      '/api/auth/admin/login',
      { email, password }
    );

    // Store token in ApiService for subsequent requests
    ApiService.setToken(response.accessToken);

    // Also store in localStorage for persistence
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('userRole', response.role);

    return response;
  },

  logout(): void {
    ApiService.setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
  },

  /**
   * Check if there's a stored token (does NOT validate with server)
   */
  hasStoredToken(): boolean {
    const token = localStorage.getItem('accessToken');
    if (token) {
      ApiService.setToken(token);
      return true;
    }
    return false;
  },

  /**
   * Validate current session with the server
   * Returns user info if valid, null if expired/invalid
   */
  async validateSession(): Promise<AdminUserInfo | null> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }

    // Set token for the API call
    ApiService.setToken(token);

    try {
      const userInfo = await ApiService.get<AdminUserInfo>('/api/auth/admin/me');

      // Update stored role with server value (in case it changed)
      localStorage.setItem('userRole', userInfo.role);

      return userInfo;
    } catch (error) {
      // Token is invalid or expired - clear it
      this.logout();
      return null;
    }
  },

  getRole(): string | null {
    return localStorage.getItem('userRole');
  },
};
