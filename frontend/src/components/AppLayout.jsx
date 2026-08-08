import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout({ mode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <strong>Performance Evaluation Tool</strong>
            <span>{user.company?.name}</span>
          </div>
        </div>

        <nav className="nav-tabs">
          {mode === "employee" ? (
            <>
              <NavLink
                to="/app/team"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                Feedback
              </NavLink>
              <NavLink
                to="/app/history"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                Scores
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/hr"
                end
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                Completion
              </NavLink>
              <NavLink
                to="/hr/directory"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                Directory
              </NavLink>
            </>
          )}
        </nav>

        <div className="topbar-right">
          <div className="user-chip">
            <strong>{user.name}</strong>
            <span>
              {user.title || user.role} · {user.role}
            </span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
