/**
 * CustomerBottomNav — Fixed bottom navigation bar for customer-facing pages.
 *
 * Tabs:
 *   الرئيسية / Home  →  /
 *   طلباتي / Orders  →  /customer/profile?tab=orders  (deep-links to orders tab)
 *   حسابي / Account  →  /customer/profile?tab=profile  OR /customer/login
 *
 * Active state is determined by current path + optional tab query param.
 * Height: 64px + safe-area-inset-bottom (for notched phones).
 */
import { useLocation, useSearch } from "wouter";
import { Home, Package, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCustomerToken } from "@/pages/CustomerLogin";

export default function CustomerBottomNav() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  // Determine which tab is active based on path + query param
  const searchParams = new URLSearchParams(search);
  const currentTab = searchParams.get("tab");

  const isHome =
    location === "/" || location === "/gas" || location === "";
  const isOrders =
    location === "/customer/profile" && currentTab === "orders";
  const isAccount =
    (location === "/customer/profile" && (currentTab === "profile" || !currentTab)) ||
    location === "/customer/login";

  const isLoggedIn = !!getCustomerToken();

  const tabs = [
    {
      id: "home",
      label: isRTL ? "الرئيسية" : "Home",
      icon: Home,
      active: isHome,
      onPress: () => navigate("/"),
    },
    {
      id: "orders",
      label: isRTL ? "طلباتي" : "Orders",
      icon: Package,
      active: isOrders,
      onPress: () => {
        if (isLoggedIn) {
          navigate("/customer/profile?tab=orders");
        } else {
          navigate("/customer/login");
        }
      },
    },
    {
      id: "account",
      label: isRTL ? "حسابي" : "Account",
      icon: User,
      active: isAccount,
      onPress: () => {
        if (isLoggedIn) {
          navigate("/customer/profile?tab=profile");
        } else {
          navigate("/customer/login");
        }
      },
    },
  ];

  // Only show on customer-facing pages
  const showOn = [
    "/",
    "/gas",
    "/customer/profile",
    "/customer/login",
  ];
  if (!showOn.includes(location)) return null;

  return (
    <nav
      aria-label={isRTL ? "التنقل الرئيسي" : "Main navigation"}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "oklch(0.10 0.005 265)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxWidth: "28rem",
        left: "50%",
        transform: "translateX(-50%)",
      }}
      dir={dir}
    >
      <div className="flex items-stretch" style={{ height: "64px" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={tab.onPress}
              className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-150 relative"
              style={{
                color: tab.active
                  ? "oklch(0.72 0.19 50)"
                  : "rgba(255,255,255,0.40)",
                background: "transparent",
                border: "none",
                minHeight: "unset",
              }}
              aria-current={tab.active ? "page" : undefined}
            >
              {/* Active indicator dot */}
              {tab.active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    width: "32px",
                    height: "3px",
                    background: "oklch(0.72 0.19 50)",
                    borderRadius: "0 0 4px 4px",
                  }}
                />
              )}
              <Icon
                className="transition-transform duration-150"
                style={{
                  width: "22px",
                  height: "22px",
                  strokeWidth: tab.active ? 2.2 : 1.8,
                  transform: tab.active ? "scale(1.1)" : "scale(1)",
                }}
              />
              <span
                className="font-semibold"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.01em",
                  fontWeight: tab.active ? 700 : 500,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
