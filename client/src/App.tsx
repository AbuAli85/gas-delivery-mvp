import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { initSentryBrowser, SentryErrorBoundary } from "./lib/sentry";

// Customer pages
import Home from "./pages/Home";
import OrderSummary from "./pages/OrderSummary";
import Payment from "./pages/Payment";
import OrderPlaced from "./pages/OrderPlaced";
import OrderTracking from "./pages/OrderTracking";

// Provider pages
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderRegister from "./pages/ProviderRegister";
import ProviderOnboarding from "./pages/ProviderOnboarding";

// Location picker
import LocationPicker from "./pages/LocationPicker";

// Customer auth
import CustomerLogin from "./pages/CustomerLogin";
import CustomerProfile from "./pages/CustomerProfile";

// Admin
import AdminPanel from "./pages/AdminPanel";
import AdminProviders from "./pages/AdminProviders";

// Review
import RatingScreen from "./pages/RatingScreen";

// About
import AboutUs from "./pages/AboutUs";

// Routes that already have an inline LanguageSwitcher in their own header.
// The floating fallback must NOT render on these routes to avoid duplication.
const ROUTES_WITH_OWN_LANG_SWITCHER = [
  "/",
  "/gas",
  "/about",
  "/order/",
  "/customer/",
  "/provider/register",
  "/provider/login",
];

function FloatingLang() {
  const [location] = useLocation();
  const hasOwn = ROUTES_WITH_OWN_LANG_SWITCHER.some(
    (prefix) => location === prefix || location.startsWith(prefix)
  );
  if (hasOwn) return null;
  return <LanguageSwitcher floating />;
}

function Router() {
  return (
    <Switch>
      {/* Customer flow */}
      <Route path="/" component={Home} />
      {/* /gas — shareable WhatsApp entry point */}
      <Route path="/gas" component={Home} />
      {/* About page */}
      <Route path="/about" component={AboutUs} />
      <Route path="/order/location" component={LocationPicker} />
      <Route path="/order/summary" component={OrderSummary} />
      <Route path="/order/payment" component={Payment} />
      <Route path="/order/placed/:orderId" component={OrderPlaced} />
      <Route path="/order/track/:orderId" component={OrderTracking} />
      <Route path="/customer/login" component={CustomerLogin} />
      <Route path="/customer/profile" component={CustomerProfile} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/providers" component={AdminProviders} />
      <Route path="/order/:orderId/review/:providerId" component={RatingScreen} />

      {/* Provider flow */}
      <Route path="/provider/register" component={ProviderRegister} />
      <Route path="/provider/onboarding/:id" component={ProviderOnboarding} />
      <Route path="/provider/login" component={ProviderLogin} />
      <Route path="/provider/:id/login" component={ProviderLogin} />
      <Route path="/provider/:providerId" component={ProviderDashboard} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Sentry INSIDE the React tree (after createRoot) to avoid
  // "Cannot read properties of null (reading 'useState')" crash.
  useEffect(() => {
    initSentryBrowser();
  }, []);

  return (
    <SentryErrorBoundary
      fallback={
        <div style={{ padding: "2rem", textAlign: "center" }}>
          Something went wrong. Please refresh the page.
        </div>
      }
    >
      <ErrorBoundary>
        <LanguageProvider>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster position="top-center" richColors />
              <Router />
              <FloatingLang />
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SentryErrorBoundary>
  );
}

export default App;
