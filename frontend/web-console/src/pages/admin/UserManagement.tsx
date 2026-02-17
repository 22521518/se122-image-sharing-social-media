import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiSearch,
  FiRefreshCw,
  FiAlertCircle,
  FiInbox,
  FiLock,
  FiUnlock,
  FiSettings,
  FiLoader,
  FiCheck,
} from 'react-icons/fi';
import { adminService, AdminUser } from '../../services/admin.service';
import './UserManagement.css';

interface UserManagementProps {
  onBack?: () => void;
}

type UserRole = 'user' | 'moderator' | 'admin';

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.searchUsers(searchQuery, page, 20);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to change ${user.name || user.email}'s role to ${newRole.toUpperCase()}?`,
    );
    if (!confirmed) {
      setEditingRole(null);
      return;
    }

    setActionPending(userId);
    try {
      await adminService.updateRoles(userId, [newRole]);
      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setEditingRole(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setActionPending(null);
    }
  };

  const handleLockToggle = async (userId: string, currentlyLocked: boolean) => {
    const action = currentlyLocked ? 'unlock' : 'lock';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this account? ${
        !currentlyLocked ? 'The user will be immediately logged out.' : ''
      }`,
    );
    if (!confirmed) return;

    setActionPending(userId);
    try {
      await adminService.setAccountLock(userId, !currentlyLocked);
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isLocked: !currentlyLocked } : u)),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update lock status');
    } finally {
      setActionPending(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'role-badge-admin';
      case 'moderator':
        return 'role-badge-moderator';
      default:
        return 'role-badge-user';
    }
  };

  return (
    <div className="user-management">
      <header className="user-management-header">
        <div>
          <h1>User Management</h1>
          <p>Manage user accounts, roles, and access</p>
        </div>
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </header>

      {/* Search Bar (AC 2) */}
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={loading}>
          <FiSearch style={{ marginRight: 6 }} />
          Search
        </button>
        <button type="button" className="refresh-button" onClick={loadUsers} disabled={loading}>
          <FiRefreshCw style={{ marginRight: 6 }} />
          Refresh
        </button>
      </form>

      {/* User Table (AC 3) */}
      <div className="table-container">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>
              <FiAlertCircle style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </p>
            <button onClick={loadUsers}>Retry</button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="empty-state">
            <p>
              <FiInbox style={{ marginRight: 6, verticalAlign: 'middle' }} />
              No users found
            </p>
            <p>Try adjusting your search query</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Join Date</th>
                <th>Posts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.isLocked ? 'locked-row' : ''}>
                  <td>
                    <div className="user-info">
                      <span className="user-name">{user.name || 'No name'}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </td>
                  <td>
                    {editingRole === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={actionPending === user.id}
                        className="role-select"
                        autoFocus
                        onBlur={() => setEditingRole(null)}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span
                        className={`role-badge ${getRoleBadgeClass(user.role)}`}
                        onClick={() => setEditingRole(user.id)}
                        title="Click to edit role"
                      >
                        {user.role.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td>
                    {user.isLocked ? (
                      <span className="status-badge locked">
                        <FiLock style={{ marginRight: 4 }} />
                        Locked
                      </span>
                    ) : (
                      <span className="status-badge active">
                        <FiCheck style={{ marginRight: 4 }} />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="date-cell">{new Date(user.joinDate).toLocaleDateString()}</td>
                  <td className="count-cell">{user.postCount}</td>
                  <td className="actions-cell">
                    {/* Role Edit Button (AC 5) */}
                    <button
                      className="action-btn role-btn"
                      onClick={() => setEditingRole(user.id)}
                      disabled={actionPending === user.id}
                      title="Edit role"
                    >
                      <FiSettings />
                    </button>
                    {/* Lock/Unlock Button (AC 4) */}
                    <button
                      className={`action-btn ${user.isLocked ? 'unlock-btn' : 'lock-btn'}`}
                      onClick={() => handleLockToggle(user.id, user.isLocked)}
                      disabled={actionPending === user.id}
                      title={user.isLocked ? 'Unlock account' : 'Lock account'}
                    >
                      {actionPending === user.id ? (
                        <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                      ) : user.isLocked ? (
                        <FiUnlock />
                      ) : (
                        <FiLock />
                      )}
                    </button>
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
    </div>
  );
}
