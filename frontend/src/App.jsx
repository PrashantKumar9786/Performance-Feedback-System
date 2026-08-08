import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import TeamPage from './pages/TeamPage';
import GiveFeedbackPage from './pages/GiveFeedbackPage';
import MyHistoryPage from './pages/MyHistoryPage';
import HrCompletionPage from './pages/HrCompletionPage';
import HrDirectoryPage from './pages/HrDirectoryPage';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="login-page muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'HR' ? '/hr' : '/app/team'} replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page muted">Loading…</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={user.role === 'HR' ? '/hr' : '/app/team'} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/app"
        element={
          <Protected roles={['EMPLOYEE', 'MANAGER']}>
            <AppLayout mode="employee" />
          </Protected>
        }
      >
        <Route index element={<Navigate to="team" replace />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="give/:employeeId" element={<GiveFeedbackPage />} />
        <Route path="history" element={<MyHistoryPage />} />
      </Route>

      <Route
        path="/hr"
        element={
          <Protected roles={['HR']}>
            <AppLayout mode="hr" />
          </Protected>
        }
      >
        <Route index element={<HrCompletionPage />} />
        <Route path="directory" element={<HrDirectoryPage />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={
              !user
                ? '/login'
                : user.role === 'HR'
                  ? '/hr'
                  : '/app/team'
            }
            replace
          />
        }
      />
    </Routes>
  );
}
