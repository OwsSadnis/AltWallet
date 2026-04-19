// Root router for AltWallet.
// Dark theme is enforced globally — we set `.dark` on <html> in index.html.
// Shell (navbar + footer) wraps every route so there's no navigation dead-ends.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Shell } from "./components/aw/Shell";
import { I18nProvider } from "./i18n";
import Landing from "./pages/Landing";
import Checker from "./pages/Checker";
import Pricing from "./pages/Pricing";
import Redeem from "./pages/Redeem";
import Dashboard from "./pages/Dashboard";
import Flagged from "./pages/Flagged";
import Admin from "./pages/Admin";
import Portfolio from "./pages/Portfolio";
import { Terms, Privacy } from "./pages/Legal";

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/checker" component={Checker} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/redeem" component={Redeem} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/flagged" component={Flagged} />
        <Route path="/admin" component={Admin} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
