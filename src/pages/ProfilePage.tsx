import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="profile-page">
      <h1 className="page-title">Your profile</h1>
      <section className="profile-card">
        <div className="profile-avatar">
          {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <h2 className="profile-name">{user?.name ?? "User"}</h2>
        <p className="profile-email">{user?.email ?? ""}</p>
        <div className="profile-actions">
          <Link to="/saved" className="profile-link">
            View saved providers
          </Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </section>
      <section className="profile-info">
        <h3>About your account</h3>
        <p>
          Your data is stored locally on this device. Sign out clears your session;
          saved providers are kept until you remove them.
        </p>
      </section>
    </div>
  );
}
