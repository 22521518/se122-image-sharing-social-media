import React, { useState } from 'react';
import { FiShield, FiAlertCircle } from 'react-icons/fi';
import '../auth/Login.css';

interface SignupPageProps {
  onSignupSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupPage({ onSignupSuccess, onSwitchToLogin }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'moderator' | 'admin'>('moderator');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { ApiService } = await import('../../services/api.service');

      // Register admin/moderator with role
      await ApiService.post('/api/auth/admin/register', { email, password, role });

      alert('Account created successfully! You can now log in.');

      onSignupSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            <FiShield style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Create Account
          </h1>
          <p>Register a new admin/moderator (dev only)</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <FiAlertCircle style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="moderator@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'moderator' | 'admin')}
              disabled={loading}
              style={{
                background: 'rgba(200, 200, 200, 0.08)',
                border: '1px solid rgba(170, 170, 170, 0.15)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#000',
                fontSize: '1rem',
              }}
            >
              <option value="moderator" style={{ background: '#3C3C3C' }}>
                Moderator
              </option>
              <option value="admin" style={{ background: '#3C3C3C' }}>
                Admin
              </option>
            </select>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '24px' }}>
          <p style={{ marginBottom: '12px' }}>Already have an account?</p>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              // color: 'rgba(255, 255, 255, 0.8)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Sign In Instead
          </button>
        </div>
      </div>
    </div>
  );
}
