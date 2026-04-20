import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Customer pages
import Home from "./pages/Home";
import OrderSummary from "./pages/OrderSummary";
import Payment from "./pages/Payment";
import OrderPlaced from "./pages/OrderPlaced";
import OrderTracking from "./pages/OrderTracking";

// Provider pages
import ProviderDashboard from "./pages/ProviderDashboard";

function Router() {
  return (
    <Switch>
      {/* Customer flow */}
      <Route path="/" component={Home} />
      {/* /gas — shareable WhatsApp entry point */}
      <Route path="/gas" component={Home} />
      <Route path="/order/summary" component={OrderSummary} />
      <Route path="/order/payment" component={Payment} />
      <Route path="/order/placed/:orderId" component={OrderPlaced} />
      <Route path="/order/track/:orderId" component={OrderTracking} />

      {/* Provider flow */}
      <Route path="/provider/:providerId" component={ProviderDashboard} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
