import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { register as registerApi } from "../api/auth";
import Navbar from "../components/Navbar";
import "./AuthPage.css";

export default function RegisterPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("authPasswordsMismatch"));
      return;
    }
    setLoading(true);
    try {
      const data = await registerApi({ email, username, password });
      login(data.access_token, data.user);
      navigate("/chat", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || t("authRegisterError"));
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
            <h1 className="auth-title">{t("authCreateAccount")}</h1>
            <p className="auth-subtitle">{t("authJoin")}</p>
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
              <label className="form-label">{t("authUsername")}</label>
              <input
                type="text"
                className="form-input"
                placeholder="ivan_student"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("authPassword")}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t("authMinPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("authConfirmPassword")}</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? t("authRegistering") : t("authRegisterBtn")}
            </button>
          </form>

          <p className="auth-switch">
            {t("authHaveAccount")}{" "}
            <Link to="/login">{t("authLoginLink")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
