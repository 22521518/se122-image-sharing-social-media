/**
 * Admin Service
 * Handles admin user management API calls (Story 8.1)
 * Handles system stats and audit logs API calls (Story 8.2)
 */

import { ApiService } from './api.service';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'moderator' | 'admin';
  isLocked: boolean;
  joinDate: string;
  postCount: number;
}

export interface AdminUserDetails extends AdminUser {
  memoryCount: number;
  followerCount: number;
  followingCount: number;
}

export interface SearchUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateRolesRequest {
  roles: ('user' | 'moderator' | 'admin')[];
}

export interface LockAccountRequest {
  locked: boolean;
}

// Story 8.2 Types
export interface SystemStats {
  totalUsers: number;
  activeUsers: {
    dau: number;
    mau: number;
  };
  totalPosts: number;
  totalMemories: number;
  storageUsedGB: number;
  errorRate: number;
  cachedAt: string;
  cacheExpiresAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  targetUserId: string;
  action: 'ROLE_CHANGE' | 'ACCOUNT_LOCK' | 'ACCOUNT_UNLOCK';
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  actionType?: string;
  targetUserId?: string;
  adminId?: string;
}

export const adminService = {
  /**
   * Search users by username or email (AC 2)
   */
  async searchUsers(query: string = '', page: number = 1, limit: number = 20): Promise<SearchUsersResponse> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return ApiService.get<SearchUsersResponse>(`/api/admin/users?${params.toString()}`);
  },

  /**
   * Get user details (AC 3)
   */
  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    return ApiService.get<AdminUserDetails>(`/api/admin/users/${userId}`);
  },

  /**
   * Update user roles (AC 5)
   */
  async updateRoles(userId: string, roles: ('user' | 'moderator' | 'admin')[]): Promise<{ success: boolean; role: string }> {
    return ApiService.put<UpdateRolesRequest, { success: boolean; role: string }>(
      `/api/admin/users/${userId}/roles`,
      { roles }
    );
  },

  /**
   * Lock/unlock user account (AC 4)
   */
  async setAccountLock(userId: string, locked: boolean): Promise<{ success: boolean; isLocked: boolean }> {
    return ApiService.put<LockAccountRequest, { success: boolean; isLocked: boolean }>(
      `/api/admin/users/${userId}/lock`,
      { locked }
    );
  },

  // Story 8.2: System Stats & Audit Logs

  /**
   * Get system-wide stats (Story 8.2 AC 3)
   */
  async getStats(): Promise<SystemStats> {
    return ApiService.get<SystemStats>('/api/admin/stats');
  },

  /**
   * Force refresh stats (bypass cache)
   */
  async refreshStats(): Promise<SystemStats> {
    return ApiService.post<unknown, SystemStats>('/api/admin/stats/refresh', {});
  },

  /**
   * Get paginated audit logs with filters (Story 8.2 AC 4)
   */
  async getAuditLogs(params: AuditLogQueryParams = {}): Promise<PaginatedAuditLogs> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.actionType) searchParams.append('actionType', params.actionType);
    if (params.targetUserId) searchParams.append('targetUserId', params.targetUserId);
    if (params.adminId) searchParams.append('adminId', params.adminId);

    return ApiService.get<PaginatedAuditLogs>(`/api/admin/audit-logs?${searchParams.toString()}`);
  },

  /**
   * Get available action types for filter dropdown
   */
  async getActionTypes(): Promise<string[]> {
    return ApiService.get<string[]>('/api/admin/audit-logs/action-types');
  },

  // Story 8.3: Admin Report & Complaint Management

  /**
   * Get all reports with full moderation history (Story 8.3 AC 2)
   */
  async getReports(status: string = 'ALL', page: number = 1, limit: number = 20): Promise<AdminReportsResponse> {
    const params = new URLSearchParams();
    params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    return ApiService.get<AdminReportsResponse>(`/api/admin/reports?${params.toString()}`);
  },

  /**
   * Ban a user (Story 8.3 AC 3, 5)
   */
  async banUser(userId: string, reason: string, duration?: number): Promise<{ success: boolean; bannedUntil: string | null }> {
    return ApiService.post<BanUserRequest, { success: boolean; bannedUntil: string | null }>(
      `/api/admin/reports/users/${userId}/ban`,
      { reason, duration }
    );
  },

  /**
   * Warn a user (Story 8.3 AC 4)
   */
  async warnUser(userId: string, reason: string): Promise<{ success: boolean }> {
    return ApiService.post<WarnUserRequest, { success: boolean }>(
      `/api/admin/reports/users/${userId}/warn`,
      { reason }
    );
  },

  /**
   * Dismiss a report (Story 8.3 AC 4)
   */
  async dismissReport(reportId: string, notes?: string): Promise<{ success: boolean }> {
    return ApiService.post<DismissReportRequest, { success: boolean }>(
      `/api/admin/reports/${reportId}/dismiss`,
      { notes }
    );
  },
};

// Story 8.3 Types
export interface AdminReport {
  id: string;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
  target?: {
    id: string;
    type: string;
    content?: string;
    authorId?: string;
    authorName?: string | null;
    authorEmail?: string;
  };
  moderationHistory: {
    id: string;
    action: string;
    notes: string | null;
    moderatorId: string;
    moderatorName: string | null;
    createdAt: string;
  }[];
}

export interface AdminReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BanUserRequest {
  reason: string;
  duration?: number;
}

export interface WarnUserRequest {
  reason: string;
}

export interface DismissReportRequest {
  notes?: string;
}
