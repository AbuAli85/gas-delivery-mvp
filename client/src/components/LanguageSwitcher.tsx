/**
 * LanguageSwitcher — two variants:
 *   <LanguageSwitcher /> — compact pill for inline header use (no fixed positioning)
 *   <LanguageSwitcher floating /> — fixed top-right corner fallback
 */
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  floating?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ floating = false, className = "" }: Props) {
  const { lang, setLang, t } = useLanguage();

  const toggle = () => setLang(lang === "ar" ? "en" : "ar");

  const label = t("lang.switch"); // shows "EN" when Arabic, "عر" when English

  if (floating) {
    return (
      <button
        onClick={toggle}
        aria-label="Switch language"
        className={`fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 hover:scale-105 ${className}`}
        style={{
          background: "linear-gradient(135deg, oklch(0.53 0.22 27), oklch(0.45 0.22 27))",
          color: "#fff",
          boxShadow: "0 2px 12px oklch(0.53 0.22 27 / 0.4)",
          letterSpacing: "0.05em",
        }}
      >
        <span className="text-sm leading-none">🌐</span>
        <span>{label}</span>
      </button>
    );
  }

  // Inline compact pill — use inside header bars
  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-all active:scale-95 hover:opacity-80 shrink-0 ${className}`}
      style={{
        background: "oklch(0.53 0.22 27 / 0.18)",
        color: "oklch(0.85 0.12 54)",
        border: "1px solid oklch(0.53 0.22 27 / 0.35)",
        letterSpacing: "0.05em",
      }}
    >
      <span className="text-xs leading-none">🌐</span>
      <span>{label}</span>
    </button>
  );
}
