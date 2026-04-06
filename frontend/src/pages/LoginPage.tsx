import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { login as loginApi } from "../api/auth";
import Navbar from "../components/Navbar";
import "./AuthPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi({ email, password });
      login(data.access_token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/chat", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || t("authInvalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-container">
        <div className="auth-card card">
          <div className="auth-header">
            <div className="auth-logo">🎓</div>
            <h1 className="auth-title">{t("authWelcome")}</h1>
            <p className="auth-subtitle">{t("authEnterAccount")}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t("authEmail")}</label>
              <input
                type="email"
                className="form-input"
                placeholder={t("authEmailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("authPassword")}</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? t("authSigningIn") : t("authSignIn")}
            </button>
          </form>

          <p className="auth-switch">
            {t("authNoAccount")}{" "}
            <Link to="/register">{t("authRegisterLink")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
