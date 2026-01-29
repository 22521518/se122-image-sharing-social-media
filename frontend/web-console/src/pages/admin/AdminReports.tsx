import React, { useState, useEffect, useCallback } from 'react';
import {
  FiFileText,
  FiMessageCircle,
  FiUser,
  FiHelpCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiAlertTriangle,
  FiSlash,
  FiCheck,
  FiLoader,
  FiInbox,
  FiEye,
} from 'react-icons/fi';
import { adminService, AdminReport } from '../../services/admin.service';
import './AdminReports.css';

interface AdminReportsProps {
  onBack?: () => void;
}

type StatusFilter = 'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED';

/**
 * AdminReports Component (Story 8.3)
 * AC 1: Admin reports queue view
 * AC 2: Full history visible (reporter, target, moderator actions, timestamps)
 * AC 3: Override moderator decisions (Ban)
 * AC 4: Final ruling with notification (Ban/Warning/Dismiss)
 */
export default function AdminReports({ onBack }: AdminReportsProps) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'ban' | 'warn' | 'dismiss';
    targetUserId: string;
    reportId?: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState<number | undefined>(undefined);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getReports(statusFilter, page, 20);
      setReports(data.reports);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleBan = async () => {
    if (!actionModal || actionModal.type !== 'ban' || !actionReason) return;

    setActionPending(actionModal.targetUserId);
    try {
      await adminService.banUser(actionModal.targetUserId, actionReason, banDuration);
      alert(
        `User has been ${banDuration ? `banned for ${banDuration} days` : 'permanently banned'}`,
      );
      setActionModal(null);
      setActionReason('');
      setBanDuration(undefined);
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to ban user');
    } finally {
      setActionPending(null);
    }
  };

  const handleWarn = async () => {
    if (!actionModal || actionModal.type !== 'warn' || !actionReason) return;

    setActionPending(actionModal.targetUserId);
    try {
      await adminService.warnUser(actionModal.targetUserId, actionReason);
      alert('Warning sent to user');
      setActionModal(null);
      setActionReason('');
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to warn user');
    } finally {
      setActionPending(null);
    }
  };

  const handleDismiss = async () => {
    if (!actionModal || actionModal.type !== 'dismiss' || !actionModal.reportId) return;

    setActionPending(actionModal.reportId);
    try {
      await adminService.dismissReport(actionModal.reportId, actionReason);
      alert('Report dismissed');
      setActionModal(null);
      setActionReason('');
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss report');
    } finally {
      setActionPending(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'RESOLVED':
        return 'status-resolved';
      case 'DISMISSED':
        return 'status-dismissed';
      default:
        return '';
    }
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'POST':
        return <FiFileText />;
      case 'COMMENT':
        return <FiMessageCircle />;
      case 'USER':
        return <FiUser />;
      default:
        return <FiHelpCircle />;
    }
  };

  return (
    <div className="admin-reports">
      <header className="admin-reports-header">
        <div>
          <h1>
            <FiFileText style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Report Management
          </h1>
          <p>Review and manage user reports and complaints</p>
        </div>
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </header>

      {/* Filter Controls (AC 1) */}
      <div className="filter-controls">
        <div className="status-filters">
          {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={loadReports} disabled={loading}>
          <FiRefreshCw style={{ marginRight: 6 }} />
          Refresh
        </button>
      </div>

      {/* Reports Table */}
      <div className="reports-container">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>
              <FiAlertCircle style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </p>
            <button onClick={loadReports}>Retry</button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="empty-state">
            <p>
              <FiInbox style={{ marginRight: 6, verticalAlign: 'middle' }} />
              No reports found
            </p>
            <p>
              No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} reports in the queue
            </p>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className={report.status === 'PENDING' ? 'pending-row' : ''}>
                  <td>
                    <span className="target-type" title={report.targetType}>
                      {getTargetTypeIcon(report.targetType)}
                    </span>
                  </td>
                  <td className="target-cell">
                    <span className="target-id">{report.targetId.slice(0, 8)}...</span>
                    {report.target?.authorName && (
                      <span className="target-author">by {report.target.authorName}</span>
                    )}
                  </td>
                  <td>
                    <span className="reason-badge">{report.reason}</span>
                    {report.description && (
                      <span className="description" title={report.description}>
                        {report.description.slice(0, 30)}...
                      </span>
                    )}
                  </td>
                  <td className="reporter-cell">
                    <span>{report.reporter.name || report.reporter.email}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="date-cell">{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    {/* View Details (AC 2) */}
                    <button
                      className="action-btn view-btn"
                      onClick={() => setSelectedReport(report)}
                      title="View full history"
                    >
                      <FiEye />
                    </button>
                    {report.status === 'PENDING' && (
                      <>
                        {/* Ban (AC 3, 5) */}
                        <button
                          className="action-btn ban-btn"
                          onClick={() =>
                            setActionModal({
                              type: 'ban',
                              targetUserId: report.target?.authorId || report.targetId,
                              reportId: report.id,
                            })
                          }
                          disabled={actionPending !== null}
                          title="Ban user"
                        >
                          <FiSlash />
                        </button>
                        {/* Warn (AC 4) */}
                        <button
                          className="action-btn warn-btn"
                          onClick={() =>
                            setActionModal({
                              type: 'warn',
                              targetUserId: report.target?.authorId || report.targetId,
                            })
                          }
                          disabled={actionPending !== null}
                          title="Warn user"
                        >
                          <FiAlertTriangle />
                        </button>
                        {/* Dismiss (AC 4) */}
                        <button
                          className="action-btn dismiss-btn"
                          onClick={() =>
                            setActionModal({
                              type: 'dismiss',
                              targetUserId: report.targetId,
                              reportId: report.id,
                            })
                          }
                          disabled={actionPending !== null}
                          title="Dismiss report"
                        >
                          <FiCheck />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next →
          </button>
        </div>
      )}

      {/* Report Details Modal (AC 2: Full history) */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              <FiFileText style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Report Details
            </h2>
            <div className="report-details">
              <div className="detail-section">
                <h3>Report Info</h3>
                <p>
                  <strong>ID:</strong> {selectedReport.id}
                </p>
                <p>
                  <strong>Type:</strong> {selectedReport.targetType}
                </p>
                <p>
                  <strong>Status:</strong> {selectedReport.status}
                </p>
                <p>
                  <strong>Reason:</strong> {selectedReport.reason}
                </p>
                {selectedReport.description && (
                  <p>
                    <strong>Description:</strong> {selectedReport.description}
                  </p>
                )}
                <p>
                  <strong>Reported:</strong> {new Date(selectedReport.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="detail-section">
                <h3>Reporter</h3>
                <p>
                  <strong>Name:</strong> {selectedReport.reporter.name || 'N/A'}
                </p>
                <p>
                  <strong>Email:</strong> {selectedReport.reporter.email}
                </p>
              </div>

              {selectedReport.target && (
                <div className="detail-section">
                  <h3>Target Content</h3>
                  <p>
                    <strong>Author:</strong> {selectedReport.target.authorName || 'N/A'}
                  </p>
                  {selectedReport.target.content && (
                    <p>
                      <strong>Content:</strong> {selectedReport.target.content.slice(0, 200)}...
                    </p>
                  )}
                </div>
              )}

              {selectedReport.moderationHistory.length > 0 && (
                <div className="detail-section">
                  <h3>Moderation History</h3>
                  <div className="history-list">
                    {selectedReport.moderationHistory.map((entry) => (
                      <div key={entry.id} className="history-entry">
                        <span className="history-action">{entry.action}</span>
                        <span className="history-moderator">
                          by {entry.moderatorName || 'Unknown'}
                        </span>
                        <span className="history-date">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        {entry.notes && <p className="history-notes">{entry.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="close-btn" onClick={() => setSelectedReport(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Action Modal (AC 3, 4: Ban/Warn/Dismiss with confirmation) */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-content action-modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {actionModal.type === 'ban' && (
                <>
                  <FiSlash style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Ban User
                </>
              )}
              {actionModal.type === 'warn' && (
                <>
                  <FiAlertTriangle style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Warn User
                </>
              )}
              {actionModal.type === 'dismiss' && (
                <>
                  <FiCheck style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Dismiss Report
                </>
              )}
            </h2>
            <div className="action-form">
              <label>
                {actionModal.type === 'dismiss' ? 'Notes (optional):' : 'Reason:'}
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionModal.type === 'dismiss' ? 'Optional notes...' : 'Enter reason...'
                  }
                  required={actionModal.type !== 'dismiss'}
                />
              </label>
              {actionModal.type === 'ban' && (
                <label>
                  Duration (days, leave empty for permanent):
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={banDuration || ''}
                    onChange={(e) =>
                      setBanDuration(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="Permanent if empty"
                  />
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setActionModal(null)}>
                Cancel
              </button>
              <button
                className={`confirm-btn ${actionModal.type}-confirm`}
                onClick={() => {
                  if (actionModal.type === 'ban') handleBan();
                  else if (actionModal.type === 'warn') handleWarn();
                  else if (actionModal.type === 'dismiss') handleDismiss();
                }}
                disabled={
                  actionPending !== null || (actionModal.type !== 'dismiss' && !actionReason)
                }
              >
                {actionPending ? (
                  <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
