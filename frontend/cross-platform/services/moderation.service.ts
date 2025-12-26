/**
 * Moderation Service
 * 
 * Handles reporting content violations and moderation-related API calls
 */

import { ApiService } from './api.service';

export type TargetType = 'POST' | 'COMMENT' | 'USER';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER';

export interface CreateReportRequest {
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  blockUser?: boolean;
}

export interface ReportResponse {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  message: string;
}

export const moderationService = {
  /**
   * Submit a report for content violation
   * AC 3: Creates report with status PENDING
   * AC 6: Returns 409 if content already reported by user
   */
  async createReport(
    request: CreateReportRequest,
    token: string | null,
  ): Promise<ReportResponse> {
    return ApiService.post<CreateReportRequest, ReportResponse>(
      '/moderation/reports',
      request,
      token,
    );
  },
};
