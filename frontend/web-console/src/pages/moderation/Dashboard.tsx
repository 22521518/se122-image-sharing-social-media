import React, { useState, useEffect, useCallback } from 'react';
import {
  FiShield,
  FiLogOut,
  FiRefreshCw,
  FiXCircle,
  FiCheckCircle,
  FiFlag,
  FiCheck,
  FiEyeOff,
  FiTrash2,
} from 'react-icons/fi';
import {
  moderationService,
  QueuedReport,
  ModerationAction,
} from '../../services/moderation.service';
import './Dashboard.css';

type TabType = 'posts' | 'comments';

interface ModerationDashboardProps {
  onLogout?: () => void;
}

export default function ModerationDashboard({ onLogout }: ModerationDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [counts, setCounts] = useState<{ posts: number; comments: number }>({ posts: 0, comments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    reportId: string;
    action: ModerationAction;
    contentPreview: string;
  } | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postQueue, commentQueue] = await Promise.all([
        moderationService.getPostQueue('PENDING'),
        moderationService.getCommentQueue('PENDING'),
      ]);

      setCounts({ posts: postQueue.length, comments: commentQueue.length });
      setQueue(activeTab === 'posts' ? postQueue : commentQueue);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleAction = async (reportId: string, action: ModerationAction, notes?: string) => {
    setActionPending(reportId);
    try {
      await moderationService.resolveReport(reportId, { action, notes });
      // Remove from queue and update counts
      setQueue((prev) => prev.filter((r) => r.id !== reportId));
      setCounts((prev) => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab] - 1),
      }));
      setConfirmDialog(null);
    } catch (err: any) {
      alert(err.message || 'Failed to perform action');
    } finally {
      setActionPending(null);
    }
  };

  const openConfirmDialog = (report: QueuedReport, action: ModerationAction) => {
    setConfirmDialog({
      isOpen: true,
      reportId: report.id,
      action,
      contentPreview: report.content?.text?.substring(0, 100) || 'No content',
    });
  };

  const getActionLabel = (action: ModerationAction) => {
    switch (action) {
      case 'APPROVE':
        return 'Dismiss Report';
      case 'HIDE':
        return 'Hide Content';
      case 'DELETE':
        return 'Delete Content';
      default:
        return action;
    }
  };

  const getReasonBadgeClass = (reason: string) => {
    switch (reason) {
      case 'SPAM':
        return 'badge-spam';
      case 'HARASSMENT':
        return 'badge-harassment';
      case 'INAPPROPRIATE':
        return 'badge-inappropriate';
      default:
        return 'badge-other';
    }
  };

  return (
    <div className="moderation-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>
            <FiShield style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Moderation Dashboard
          </h1>
          <p>Review and moderate reported content</p>
        </div>
        {onLogout && (
          <button className="logout-button" onClick={onLogout}>
            <FiLogOut style={{ marginRight: 6 }} /> Logout
          </button>
        )}
      </header>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts ({counts.posts})
        </button>
        <button
          className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({counts.comments})
        </button>
        <button className="refresh-button" onClick={loadQueue} disabled={loading}>
          <FiRefreshCw style={{ marginRight: 6 }} /> Refresh
        </button>
      </div>

      {/* Queue content */}
      <div className="queue-container">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading queue...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>
              <FiXCircle style={{ marginRight: 6, verticalAlign: 'middle' }} /> {error}
            </p>
            <button onClick={loadQueue}>Retry</button>
          </div>
        )}

        {!loading && !error && queue.length === 0 && (
          <div className="empty-state">
            <p>
              <FiCheckCircle style={{ marginRight: 6, verticalAlign: 'middle' }} /> No pending reports!
            </p>
            <p>The queue is empty. Great work!</p>
          </div>
        )}

        {!loading &&
          !error &&
          queue.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <span className={`reason-badge ${getReasonBadgeClass(report.reason)}`}>
                  {report.reason}
                </span>
                <span className="report-count">
                  <FiFlag style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {report.reportCount} report{report.reportCount > 1 ? 's' : ''}
                </span>
                <span className="report-date">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="report-content">
                <div className="content-preview">
                  <h4>Content:</h4>
                  <p>{report.content?.text || 'Content not available'}</p>
                </div>

                <div className="content-meta">
                  <p>
                    <strong>Author:</strong> {report.content?.authorName || 'Unknown'}
                  </p>
                  <p>
                    <strong>Report by:</strong> {report.reporter.name || report.reporter.email}
                  </p>
                  {report.description && (
                    <p>
                      <strong>Details:</strong> {report.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="report-actions">
                <button
                  className="action-button approve"
                  onClick={() => openConfirmDialog(report, 'APPROVE')}
                  disabled={actionPending === report.id}
                >
                  <FiCheck style={{ marginRight: 6 }} /> Abort
                </button>
                {/* <button
                  className="action-button hide"
                  onClick={() => openConfirmDialog(report, 'HIDE')}
                  disabled={actionPending === report.id}
                >
                  <FiEyeOff style={{ marginRight: 6 }} /> Hide
                </button> */}
                <button
                  className="action-button delete"
                  onClick={() => openConfirmDialog(report, 'DELETE')}
                  disabled={actionPending === report.id}
                >
                  <FiTrash2 style={{ marginRight: 6 }} /> Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>
              Are you sure you want to{' '}
              <strong>{getActionLabel(confirmDialog.action).toLowerCase()}</strong>?
            </p>
            <p className="preview-text">"{confirmDialog.contentPreview}..."</p>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button
                className={`confirm-button ${confirmDialog.action.toLowerCase()}`}
                onClick={() => handleAction(confirmDialog.reportId, confirmDialog.action)}
                disabled={actionPending === confirmDialog.reportId}
              >
                {actionPending === confirmDialog.reportId
                  ? 'Processing...'
                  : getActionLabel(confirmDialog.action)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
