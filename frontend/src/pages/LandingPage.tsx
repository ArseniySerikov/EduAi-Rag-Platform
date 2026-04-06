import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import "./LandingPage.css";

export default function LandingPage() {
  const { t } = useLanguage();

  const features = [
    { icon: "🤖", title: t("landingF1Title"), desc: t("landingF1Desc") },
    { icon: "📚", title: t("landingF2Title"), desc: t("landingF2Desc") },
    { icon: "💬", title: t("landingF3Title"), desc: t("landingF3Desc") },
    { icon: "🔒", title: t("landingF4Title"), desc: t("landingF4Desc") },
    { icon: "🎙️", title: t("landingF5Title"), desc: t("landingF5Desc") },
    { icon: "📰", title: t("landingF6Title"), desc: t("landingF6Desc") },
  ];

  return (
    <div className="landing">
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">{t("landingHeroBadge")}</div>
            <h1 className="hero-title">
              {t("landingHeroTitle1")}
              <br />
              <span className="hero-accent">{t("landingHeroTitle2")}</span>
            </h1>
            <p className="hero-subtitle">{t("landingHeroSubtitle")}</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                {t("landingCtaFree")}
              </Link>
              <Link to="/login" className="btn btn-ghost btn-lg">
                {t("landingCtaHaveAccount")}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="chat-demo">
              <div className="chat-demo-header">
                <span className="chat-demo-dot red" />
                <span className="chat-demo-dot yellow" />
                <span className="chat-demo-dot green" />
                <span className="chat-demo-title">{t("landingDemoTitle")}</span>
              </div>
              <div className="chat-demo-body">
                <div className="chat-demo-msg user">{t("landingDemoUser1")}</div>
                <div className="chat-demo-msg assistant">
                  {t("landingDemoAssistant1")}
                  <span className="rag-badge">📚 RAG</span>
                </div>
                <div className="chat-demo-msg user">{t("landingDemoUser2")}</div>
                <div className="chat-demo-msg assistant typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="features-inner">
            <h2 className="section-title">{t("landingFeaturesTitle")}</h2>
            <p className="section-subtitle">{t("landingFeaturesSubtitle")}</p>
            <div className="features-grid">
              {features.map((f) => (
                <div className="feature-card card" key={f.title}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">{t("landingCtaTitle")}</h2>
            <p className="cta-sub">{t("landingCtaSub")}</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              {t("landingCtaButton")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>{t("landingFooter")}</p>
      </footer>
    </div>
  );
}
