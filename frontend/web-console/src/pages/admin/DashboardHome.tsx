import { useState, useEffect, useCallback } from 'react';
import {
  FiBarChart2,
  FiUsers,
  FiFileText,
  FiBookmark,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import { adminService, SystemStats } from '../../services/admin.service';
import './DashboardHome.css';

interface DashboardHomeProps {
  onNavigateToAuditLogs?: () => void;
}

/**
 * Dashboard Home Component (Story 8.2 - AC 1, 2, 3)
 * Displays KPI cards with system-wide statistics
 */
export default function DashboardHome({ onNavigateToAuditLogs }: DashboardHomeProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await adminService.refreshStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh stats');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 5 minutes (as per AC 3)
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>
          <FiAlertCircle style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {error}
        </p>
        <button onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 style={{ color: '#000' }}>
            <FiBarChart2 style={{ marginRight: 8, verticalAlign: 'middle' }} />
            System Dashboard
          </h1>
          <p className="dashboard-subtitle" style={{ color: '#000' }}>
            Platform health and growth metrics
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <FiRefreshCw style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />{' '}
                Refreshing...
              </>
            ) : (
              <>
                <FiRefreshCw style={{ marginRight: 6 }} /> Refresh Stats
              </>
            )}
          </button>
        </div>
      </header>

      <div className="kpi-grid">
        {/* Users Card */}
        <div className="kpi-card users-card">
          <div className="kpi-icon">
            <FiUsers size={28} />
          </div>
          <div className="kpi-content">
            <h3 style={{ color: '#000' }}>Total Users</h3>
            <div className="kpi-value" style={{ color: '#000' }}>
              {stats?.totalUsers.toLocaleString() || 0}
            </div>
            <div className="kpi-breakdown">
              <span className="active-indicator dau">
                <strong>DAU:</strong> {stats?.activeUsers.dau.toLocaleString() || 0}
              </span>
              <span className="active-indicator mau">
                <strong>MAU:</strong> {stats?.activeUsers.mau.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Posts Card */}
        <div className="kpi-card posts-card">
          <div className="kpi-icon">
            <FiFileText size={28} />
          </div>
          <div className="kpi-content">
            <h3 style={{ color: '#000' }}>Total Posts</h3>
            <div className="kpi-value" style={{ color: '#000' }}>
              {stats?.totalPosts.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Memories Card */}
        <div className="kpi-card memories-card">
          <div className="kpi-icon">
            <FiBookmark size={28} />
          </div>
          <div className="kpi-content">
            <h3 style={{ color: '#000' }}>Total Memories</h3>
            <div className="kpi-value" style={{ color: '#000' }}>
              {stats?.totalMemories.toLocaleString() || 0}
            </div>
          </div>
        </div>

      </div>

      {/* Cache Info */}
      <div className="cache-info">
        <span>
          Last updated: {stats?.cachedAt ? new Date(stats.cachedAt).toLocaleTimeString() : 'N/A'}
        </span>
        <span className="separator">•</span>
        <span>
          Next refresh:{' '}
          {stats?.cacheExpiresAt ? new Date(stats.cacheExpiresAt).toLocaleTimeString() : 'N/A'}
        </span>
      </div>
    </div>
  );
}
