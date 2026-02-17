import { useState, useEffect, useCallback } from 'react';
import { adminService, PaginatedAuditLogs, AuditLogEntry } from '../../services/admin.service';
import { LuCrown, LuLock, LuLockOpen, LuClipboardList } from 'react-icons/lu';
import './AuditLogViewer.css';

interface AuditLogViewerProps {
  onBack?: () => void;
}

/**
 * Audit Log Viewer Component (Story 8.2 - AC 4)
 * Displays paginated audit logs with filters: date range, action type, user
 */
export default function AuditLogViewer({ onBack }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [targetUserFilter, setTargetUserFilter] = useState('');
  const [targetUserError, setTargetUserError] = useState<string | null>(null);

  // UUID validation helper
  const isValidUUID = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      // Only include targetUserId if it's a valid UUID
      const validTargetUserId =
        targetUserFilter && isValidUUID(targetUserFilter) ? targetUserFilter : undefined;
      const data: PaginatedAuditLogs = await adminService.getAuditLogs({
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        actionType: selectedActionType || undefined,
        targetUserId: validTargetUserId,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, selectedActionType, targetUserFilter]);

  const fetchActionTypes = useCallback(async () => {
    try {
      const types = await adminService.getActionTypes();
      setActionTypes(types);
    } catch {
      // Fallback to known action types
      setActionTypes(['ROLE_CHANGE', 'ACCOUNT_LOCK', 'ACCOUNT_UNLOCK']);
    }
  }, []);

  useEffect(() => {
    fetchActionTypes();
  }, [fetchActionTypes]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilters = () => {
    // Validate targetUserFilter if provided
    if (targetUserFilter && !isValidUUID(targetUserFilter)) {
      setTargetUserError('Please enter a valid UUID (e.g., c8e549b0-1234-5678-9abc-def012345678)');
      return;
    }
    setTargetUserError(null);
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedActionType('');
    setTargetUserFilter('');
    setTargetUserError(null);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      ROLE_CHANGE: { label: 'Role Change', icon: <LuCrown size={18} />, color: '#6366f1' },
      ACCOUNT_LOCK: { label: 'Account Lock', icon: <LuLock size={18} />, color: '#ef4444' },
      ACCOUNT_UNLOCK: { label: 'Account Unlock', icon: <LuLockOpen size={18} />, color: '#22c55e' },
    };
    return actionMap[action] || { label: action, icon: <LuClipboardList size={18} />, color: '#6b7280' };
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return '-';
    if (details.previousRole && details.newRole) {
      return `${details.previousRole} → ${details.newRole}`;
    }
    if (typeof details.previousLocked !== 'undefined') {
      return details.newLocked ? 'Locked' : 'Unlocked';
    }
    if (typeof details.reason !== 'undefined') {
      const parts = [];
      if (details.reason) parts.push(`Reason: ${details.reason}`);
      if (details.duration) parts.push(`Duration: ${details.duration}`);
      if (details.bannedUntil) parts.push(`Until: ${new Date(details.bannedUntil as string).toLocaleString()}`);
      if (details.reportId) parts.push(`Report ID: ${details.reportId}`);
      if (details.notes) parts.push(`Notes: ${details.notes}`);
      return parts.join(' | ') || JSON.stringify(details);
    }
    return JSON.stringify(details);
  };

  return (
    <div className="audit-log-viewer">
      <header className="viewer-header">
        <div className="header-left">
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              ← Back
            </button>
          )}
          <h1>📋 Audit Logs</h1>
        </div>
        <div className="total-count">{total} total entries</div>
      </header>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Action Type</label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
            >
              <option value="">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {formatAction(type).label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Target User ID</label>
            <input
              type="text"
              placeholder="Enter full UUID..."
              value={targetUserFilter}
              onChange={(e) => {
                setTargetUserFilter(e.target.value);
                setTargetUserError(null);
              }}
              className={targetUserError ? 'input-error' : ''}
            />
            {targetUserError && <span className="filter-error">{targetUserError}</span>}
          </div>
          <div className="filter-actions">
            <button className="apply-btn" onClick={handleApplyFilters}>
              Apply Filters
            </button>
            <button className="clear-btn" onClick={handleClearFilters}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchLogs}>Retry</button>
        </div>
      )}

      {/* Logs Table */}
      {!loading && !error && (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Action</th>
                  <th>Admin ID</th>
                  <th>Target User ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionInfo = formatAction(log.action);
                    return (
                      <tr key={log.id}>
                        <td className="date-cell">{formatDate(log.createdAt)}</td>
                        <td>
                          <span
                            className="action-badge"
                            style={{
                              backgroundColor: `${actionInfo.color}20`,
                              color: actionInfo.color,
                            }}
                          >
                            {actionInfo.icon} {actionInfo.label}
                          </span>
                        </td>
                        <td className="id-cell">{log.adminId.slice(0, 8)}...</td>
                        <td className="id-cell">{log.targetUserId.slice(0, 8)}...</td>
                        <td className="details-cell">{formatDetails(log.details)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
