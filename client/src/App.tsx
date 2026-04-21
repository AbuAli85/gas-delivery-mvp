import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import LanguageSwitcher from "./components/LanguageSwitcher";

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
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-center" richColors />
            <Router />
            <LanguageSwitcher floating />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
