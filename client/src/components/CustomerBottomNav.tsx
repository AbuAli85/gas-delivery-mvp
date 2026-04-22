/**
 * CustomerBottomNav — Fixed bottom navigation bar for customer-facing pages.
 *
 * POSITIONING STRATEGY:
 * The app uses a `mobile-screen` container (max-w-md, centered with auto margins).
 * We cannot use `left-0 right-0` because on desktop the container is narrower than
 * the viewport. Instead we use a wrapper that is `fixed inset-x-0 bottom-0` at
 * full viewport width but contains a max-w-[28rem] inner bar that auto-centers —
 * matching exactly the mobile-screen container width.
 *
 * Tabs:
 *   الرئيسية / Home  →  /
 *   طلباتي / Orders  →  /customer/profile?tab=orders
 *   حسابي / Account  →  /customer/profile?tab=profile  OR /customer/login
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

  const searchParams = new URLSearchParams(search);
  const currentTab = searchParams.get("tab");

  const isHome = location === "/" || location === "/gas" || location === "";
  const isOrders = location === "/customer/profile" && currentTab === "orders";
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
      onPress: () =>
        isLoggedIn
          ? navigate("/customer/profile?tab=orders")
          : navigate("/customer/login"),
    },
    {
      id: "account",
      label: isRTL ? "حسابي" : "Account",
      icon: User,
      active: isAccount,
      onPress: () =>
        isLoggedIn
          ? navigate("/customer/profile?tab=profile")
          : navigate("/customer/login"),
    },
  ];

  const showOn = ["/", "/gas", "/customer/profile", "/customer/login"];
  if (!showOn.includes(location)) return null;

  return (
    /*
     * Outer wrapper: fixed to the full viewport bottom edge.
     * This ensures the bar is always at the very bottom of the screen.
     */
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/*
       * Inner bar: same max-width as .mobile-screen (28rem / 448px),
       * centered with auto margins — perfectly aligns with the page content.
       */}
      <nav
        aria-label={isRTL ? "التنقل الرئيسي" : "Main navigation"}
        className="mx-auto flex items-stretch"
        style={{
          maxWidth: "28rem",
          height: "64px",
          background: "oklch(0.10 0.005 265)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
        dir={dir}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={tab.onPress}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-150 relative"
              style={{
                color: tab.active
                  ? "oklch(0.72 0.19 50)"
                  : "rgba(255,255,255,0.40)",
                background: "transparent",
                border: "none",
              }}
              aria-current={tab.active ? "page" : undefined}
            >
              {/* Active indicator — thin bar at top of tab */}
              {tab.active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: "32px",
                    height: "3px",
                    background: "oklch(0.72 0.19 50)",
                    borderRadius: "0 0 4px 4px",
                  }}
                />
              )}

              <Icon
                style={{
                  width: "22px",
                  height: "22px",
                  strokeWidth: tab.active ? 2.2 : 1.8,
                  transform: tab.active ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.15s",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: tab.active ? 700 : 500,
                  letterSpacing: "0.01em",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
