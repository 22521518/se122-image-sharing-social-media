import { useState, useEffect, useCallback } from 'react';
import { FiBarChart2, FiShield, FiUsers, FiFileText, FiLogOut } from 'react-icons/fi';
import ModerationDashboard from './pages/moderation/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import DashboardHome from './pages/admin/DashboardHome';
import AuditLogViewer from './pages/admin/AuditLogViewer';
import AdminReports from './pages/admin/AdminReports';
import LoginPage from './pages/auth/Login';
import SignupPage from './pages/auth/Signup';
import { authService } from './services/auth.service';
import { ApiService } from './services/api.service';
import './App.css';

type AuthPage = 'login' | 'signup';
type AdminPage = 'moderation' | 'users' | 'dashboard' | 'audit-logs' | 'reports';

// Valid admin pages for URL routing
const VALID_ADMIN_PAGES: AdminPage[] = ['dashboard', 'moderation', 'users', 'audit-logs', 'reports'];

/**
 * Get admin page from URL hash
 */
function getAdminPageFromHash(): AdminPage {
  const hash = window.location.hash.replace('#', '');
  if (VALID_ADMIN_PAGES.includes(hash as AdminPage)) {
    return hash as AdminPage;
  }
  return 'dashboard'; // Default
}

/**
 * Get auth page from URL hash
 */
function getAuthPageFromHash(): AuthPage {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'signup') return 'signup';
  return 'login';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authPage, setAuthPage] = useState<AuthPage>(getAuthPageFromHash);
  const [adminPage, setAdminPage] = useState<AdminPage>(getAdminPageFromHash);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Navigate to admin page and update URL hash
  const navigateToAdminPage = useCallback((page: AdminPage) => {
    setAdminPage(page);
    window.location.hash = page;
  }, []);

  // Navigate to auth page and update URL hash
  const navigateToAuthPage = useCallback((page: AuthPage) => {
    setAuthPage(page);
    window.location.hash = page;
  }, []);

  useEffect(() => {
    // Validate session with server on startup
    const validateAndSetAuth = async () => {
      // First check if there's a stored token
      if (!authService.hasStoredToken()) {
        setIsAuthenticated(false);
        return;
      }

      // Validate the token with the server
      const userInfo = await authService.validateSession();
      
      if (userInfo) {
        // Session is valid
        setIsAuthenticated(true);
        setUserRole(userInfo.role);
      } else {
        // Session is invalid or expired
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    validateAndSetAuth();

    // Register global 401 handler for auto-logout on session expiry
    ApiService.setOnUnauthorized(() => {
      authService.logout();
      setIsAuthenticated(false);
      setUserRole(null);
    });

    // Listen for browser back/forward navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_ADMIN_PAGES.includes(hash as AdminPage)) {
        setAdminPage(hash as AdminPage);
      } else if (hash === 'signup') {
        setAuthPage('signup');
      } else if (hash === 'login' || hash === '') {
        setAuthPage('login');
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Cleanup on unmount
    return () => {
      ApiService.setOnUnauthorized(null);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    // Navigate to dashboard after login
    navigateToAdminPage('dashboard');
  };

  const handleSignupSuccess = () => {
    // After signup, switch to login page
    navigateToAuthPage('login');
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.hash = 'login';
  };

  // Show loading while checking auth status
  if (isAuthenticated === null) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          color: '#0F0F11',
        }}
      >
        Loading...
      </div>
    );
  }

  // Show login or signup page if not authenticated
  if (!isAuthenticated) {
    if (authPage === 'signup') {
      return (
        <SignupPage
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => navigateToAuthPage('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => navigateToAuthPage('signup')}
      />
    );
  }

  // Wrapper with admin navigation
  const AdminWrapper = ({ children }: { children: React.ReactNode }) => (
    <div>
      {/* Admin/Moderator Navigation Tabs */}
      {(userRole === 'admin' || userRole === 'moderator') && (
        <nav className="admin-nav">
          {/* Story 8.2: Dashboard for admins */}
          {userRole === 'admin' && (
            <button
              className={`admin-nav-btn ${adminPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateToAdminPage('dashboard')}
            >
              <FiBarChart2 style={{ marginRight: 6 }} /> Dashboard
            </button>
          )}
          <button
            className={`admin-nav-btn ${adminPage === 'moderation' ? 'active' : ''}`}
            onClick={() => navigateToAdminPage('moderation')}
          >
            <FiShield style={{ marginRight: 6 }} /> Moderation
          </button>
          {/* Only admins can access User Management (AC 5 - moderator gets moderation only) */}
          {userRole === 'admin' && (
            <>
              <button
                className={`admin-nav-btn ${adminPage === 'users' ? 'active' : ''}`}
                onClick={() => navigateToAdminPage('users')}
              >
                <FiUsers style={{ marginRight: 6 }} /> Users
              </button>
              <button
                className={`admin-nav-btn ${adminPage === 'audit-logs' ? 'active' : ''}`}
                onClick={() => navigateToAdminPage('audit-logs')}
              >
                <FiFileText style={{ marginRight: 6 }} /> Audit Logs
              </button>
              <button
                className={`admin-nav-btn ${adminPage === 'reports' ? 'active' : ''}`}
                onClick={() => navigateToAdminPage('reports')}
              >
                <FiFileText style={{ marginRight: 6 }} /> Reports
              </button>
            </>
          )}
          <button className="admin-nav-btn logout-btn" onClick={handleLogout}>
            <FiLogOut style={{ marginRight: 6 }} /> Logout
          </button>
        </nav>
      )}
      {children}
    </div>
  );

  // Show dashboard if authenticated (Story 8.2 - default to dashboard for admins)
  if (adminPage === 'dashboard' && userRole === 'admin') {
    return (
      <AdminWrapper>
        <DashboardHome onNavigateToAuditLogs={() => navigateToAdminPage('audit-logs')} />
      </AdminWrapper>
    );
  }

  if (adminPage === 'audit-logs' && userRole === 'admin') {
    return (
      <AdminWrapper>
        <AuditLogViewer onBack={() => navigateToAdminPage('dashboard')} />
      </AdminWrapper>
    );
  }

  if (adminPage === 'users' && userRole === 'admin') {
    return (
      <AdminWrapper>
        <UserManagement onBack={() => navigateToAdminPage('dashboard')} />
      </AdminWrapper>
    );
  }

  // Story 8.3: Admin Reports Management
  if (adminPage === 'reports' && userRole === 'admin') {
    return (
      <AdminWrapper>
        <AdminReports onBack={() => navigateToAdminPage('dashboard')} />
      </AdminWrapper>
    );
  }

  return (
    <AdminWrapper>
      <ModerationDashboard onLogout={handleLogout} />
    </AdminWrapper>
  );
}

export default App;
