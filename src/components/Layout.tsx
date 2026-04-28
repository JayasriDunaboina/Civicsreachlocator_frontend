import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export function Layout() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="layout">
      <header className="app-header">
        <Link to="/" className="header-logo">
          CivicReach Locator
        </Link>
        <nav className="header-nav">
          {isLoggedIn ? (
            <>
              <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Home
              </NavLink>
              <NavLink to="/saved" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Saved
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Profile
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                About
              </NavLink>
              <button type="button" className="nav-link nav-btn" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                About
              </NavLink>
              <Link to="/login" className="nav-link nav-login">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
