/**
 * LanguageSwitcher — floating pill button
 * Shows the label of the OTHER language (click to switch).
 * Positioned fixed bottom-right so it's always accessible.
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  const toggle = () => setLang(lang === "ar" ? "en" : "ar");

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all active:scale-95 hover:scale-105"
      style={{
        background: "linear-gradient(135deg, oklch(0.71 0.18 54), oklch(0.62 0.22 40))",
        color: "#fff",
        boxShadow: "0 4px 16px oklch(0.71 0.18 54 / 0.45)",
        letterSpacing: "0.03em",
      }}
    >
      <span className="text-base leading-none">🌐</span>
      <span>{t("lang.switch")}</span>
    </button>
  );
}
