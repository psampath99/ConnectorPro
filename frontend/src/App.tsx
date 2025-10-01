import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/auth/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Contacts from "./pages/Contacts";
import Messages from "./pages/Messages";
import Meetings from "./pages/Meetings";
import Tasks from "./pages/Tasks";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import CalendarCallback from "./pages/CalendarCallback";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import NotFound from "./pages/NotFound";

// Demo AI Assistant component that ensures demo context is set
const DemoAIAssistant = () => {
  const { isDemoUser, loginAsDemo } = useAuth();
  
  useEffect(() => {
    console.log('🔍 [DEBUG] DemoAIAssistant component mounted, isDemoUser:', isDemoUser);
    
    // If not already a demo user, set up demo context
    if (!isDemoUser) {
      console.log('🔍 [DEBUG] Setting up demo context via loginAsDemo');
      loginAsDemo();
    }
  }, [isDemoUser, loginAsDemo]);
  
  return <AIAssistant />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  // Instrumentation: Track App mount/unmount cycles
  useEffect(() => {
    console.log('[MOUNT] App');
    return () => console.log('[UNMOUNT] App');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
              <Routes>
                {/* Public landing page - accessible to everyone */}
                <Route
                  path="/"
                  element={
                    <AuthGuard type="public">
                      <LandingPage />
                    </AuthGuard>
                  }
                />
                
                {/* Demo route - bypasses all authentication */}
                <Route
                  path="/demo"
                  element={<DemoAIAssistant />}
                />
              <Route
                path="/login"
                element={
                  <AuthGuard type="auth-only">
                    <Login />
                  </AuthGuard>
                }
              />
              <Route
                path="/signup"
                element={
                  <AuthGuard type="auth-only">
                    <Signup />
                  </AuthGuard>
                }
              />
              
              {/* Onboarding route - protected but allows incomplete onboarding */}
              <Route
                path="/onboarding"
                element={
                  <AuthGuard type="protected" requireOnboarding={false}>
                    <OnboardingFlow
                      onComplete={(userData) => {
                        // This will be handled by the onboarding component
                        console.log('Onboarding completed for user:', userData);
                      }}
                    />
                  </AuthGuard>
                }
              />
              
              {/* Protected routes - require authentication and completed onboarding */}
              <Route
                path="/dashboard"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Index />
                  </AuthGuard>
                }
              />
              <Route
                path="/feed"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Feed />
                  </AuthGuard>
                }
              />
              <Route
                path="/contacts"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Contacts />
                  </AuthGuard>
                }
              />
              <Route
                path="/messages"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Messages />
                  </AuthGuard>
                }
              />
              <Route
                path="/meetings"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Meetings />
                  </AuthGuard>
                }
              />
              <Route
                path="/tasks"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <Tasks />
                  </AuthGuard>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <AuthGuard type="protected" requireOnboarding={true}>
                    <AIAssistant />
                  </AuthGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthGuard type="protected" requireOnboarding={false}>
                    <Settings />
                  </AuthGuard>
                }
              />
              
              {/* Semi-protected routes - special handling */}
              <Route
                path="/calendar/callback"
                element={
                  <AuthGuard type="protected">
                    <CalendarCallback />
                  </AuthGuard>
                }
              />
              
              {/* Catch-all route */}
              <Route
                path="*"
                element={
                  <AuthGuard type="public">
                    <NotFound />
                  </AuthGuard>
                }
              />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;