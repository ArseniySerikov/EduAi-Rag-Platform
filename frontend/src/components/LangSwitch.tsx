import { useLanguage } from "../contexts/LanguageContext";
import "./LangSwitch.css";

export default function LangSwitch() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="lang-switch lang-switch--inline" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-btn ${lang === "uk" ? "active" : ""}`}
        onClick={() => setLang("uk")}
      >
        {t("langUk")}
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === "en" ? "active" : ""}`}
        onClick={() => setLang("en")}
      >
        {t("langEn")}
      </button>
    </div>
  );
}
