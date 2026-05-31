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
import { ProtectedRoute } from "./components/aw/ProtectedRoute";
import { I18nProvider } from "./i18n";
import Landing from "./pages/Landing";
import Checker from "./pages/Checker";
import Pricing from "./pages/Pricing";
import Redeem from "./pages/Redeem";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Flagged from "./pages/Flagged";
import Admin from "./pages/Admin";
import History from "./pages/History";
import { Terms, Privacy } from "./pages/Legal";
import { AnnouncementBanner } from "./components/aw/AnnouncementBanner";
import { UpdateBanner } from "./components/aw/UpdateBanner";

function Router() {
  return (
    <Shell>
      <AnnouncementBanner />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/checker" component={Checker} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/redeem" component={Redeem} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/history">
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        </Route>
        <Route path="/flagged" component={Flagged} />
        <Route path="/admin">
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        </Route>
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
            <UpdateBanner />
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
