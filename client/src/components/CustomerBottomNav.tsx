import { useLocation } from "wouter";
import { Home, Package, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CustomerBottomNav() {
  const [location, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const tabs = [
    {
      id: "home",
      path: "/",
      icon: Home,
      label: isRTL ? "الرئيسية" : "Home",
      active: location === "/" || location === "",
    },
    {
      id: "orders",
      path: "/customer/profile",
      icon: Package,
      label: isRTL ? "طلباتي" : "My Orders",
      active: location === "/customer/profile",
    },
    {
      id: "account",
      path: "/customer/login",
      icon: User,
      label: isRTL ? "حسابي" : "Account",
      active: location === "/customer/login",
    },
  ];

  // Only show on customer-facing pages
  const showOn = ["/", "/customer/profile", "/customer/login"];
  if (!showOn.includes(location)) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
      style={{
        background: "oklch(0.12 0 0)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "60px",
      }}
      dir={dir}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            style={{
              color: tab.active ? "oklch(0.62 0.22 27)" : "rgba(255,255,255,0.35)",
            }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
