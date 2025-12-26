/**
 * Moderation Service for Web Console
 * 
 * Handles moderation queue and actions
 */

import { ApiService } from './api.service';

export type TargetType = 'POST' | 'COMMENT' | 'USER';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export type ModerationAction = 'APPROVE' | 'HIDE' | 'DELETE' | 'LOCK';

export interface QueuedReport {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reportCount: number;
  createdAt: string;
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
  content?: {
    id: string;
    text?: string;
    authorId?: string;
    authorName?: string | null;
  };
}

export interface ResolveReportRequest {
  action: ModerationAction;
  notes?: string;
}

export interface ResolveReportResponse {
  reportId: string;
  action: ModerationAction;
  status: ReportStatus;
  logId: string;
}

export const moderationService = {
  /**
   * Get post moderation queue
   */
  async getPostQueue(status: ReportStatus = 'PENDING'): Promise<QueuedReport[]> {
    return ApiService.get<QueuedReport[]>(`/moderation/queue/posts?status=${status}`);
  },

  /**
   * Get comment moderation queue  
   */
  async getCommentQueue(status: ReportStatus = 'PENDING'): Promise<QueuedReport[]> {
    return ApiService.get<QueuedReport[]>(`/moderation/queue/comments?status=${status}`);
  },

  /**
   * Resolve a report with an action
   */
  async resolveReport(
    reportId: string,
    request: ResolveReportRequest,
  ): Promise<ResolveReportResponse> {
    return ApiService.post<ResolveReportRequest, ResolveReportResponse>(
      `/moderation/resolve/${reportId}`,
      request,
    );
  },

  /**
   * Lock comments on a post
   */
  async lockPostComments(postId: string): Promise<{ success: boolean; message: string }> {
    return ApiService.post<{}, { success: boolean; message: string }>(
      `/moderation/posts/${postId}/lock-comments`,
      {},
    );
  },
};
