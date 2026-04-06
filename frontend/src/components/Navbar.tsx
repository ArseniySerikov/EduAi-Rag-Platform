import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import LangSwitch from "./LangSwitch";
import "./Navbar.css";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">🎓</span>
          <span className="navbar-logo-text">EduAI</span>
        </Link>

        <nav className="navbar-nav">
          <LangSwitch />

          {isAuthenticated ? (
            <>
              <Link to={isAdmin ? "/admin" : "/chat"} className="navbar-link">
                {isAdmin ? t("navPanel") : t("navChats")}
              </Link>
              <span className="navbar-username">{user?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                {t("login")}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                {t("register")}
              </Link>
            </>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? t("themeDark") : t("themeLight")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </nav>
      </div>
    </header>
  );
}
