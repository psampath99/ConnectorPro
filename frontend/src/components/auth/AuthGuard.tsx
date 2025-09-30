import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { storage } from '@/lib/storage';

interface AuthGuardProps {
  children: React.ReactNode;
  type: 'public' | 'auth-only' | 'protected';
  requireOnboarding?: boolean;
}

/**
 * AuthGuard component that handles different authentication scenarios:
 * - 'public': Accessible to everyone (landing page)
 * - 'auth-only': Only accessible to unauthenticated users (login/signup)
 * - 'protected': Only accessible to authenticated users (dashboard, etc.)
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  type,
  requireOnboarding = false
}) => {
  const { user, isLoading, isAuthenticated, isInitialized, isDemoUser } = useAuth();
  const location = useLocation();
  const { hasCompletedOnboarding, getIntendedPath } = useAuthFlow();

  // Instrumentation: Track AuthGuard mount/unmount cycles
  useEffect(() => {
    console.log('[MOUNT] AuthGuard', type);
    return () => console.log('[UNMOUNT] AuthGuard', type);
  }, [type]);

  // Store intended destination for protected routes
  useEffect(() => {
    if (type === 'protected' && !isAuthenticated && !isLoading) {
      const intendedPath = location.pathname + location.search;
      if (intendedPath !== '/login' && intendedPath !== '/signup') {
        sessionStorage.setItem('connectorpro_redirect_after_login', intendedPath);
      }
    }
  }, [type, isAuthenticated, isLoading, location.pathname, location.search]);

  // Show loading state while checking authentication
  // Show loading state until authentication is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">ConnectorPro</p>
            <p className="text-sm text-muted-foreground">
              Loading your workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle different guard types
  switch (type) {
    case 'public':
      // Public routes are accessible to everyone
      return <>{children}</>;

    case 'auth-only':
      // Auth-only routes (login/signup) should redirect authenticated users
      if (isAuthenticated) {
        // Special handling for demo users - always redirect to settings
        if (isDemoUser) {
          return <Navigate to="/settings" replace />;
        }
        
        const hasOnboarding = hasCompletedOnboarding();
        
        if (!hasOnboarding) {
          // User needs onboarding
          return <Navigate to="/onboarding" replace />;
        } else {
          // User is authenticated and has completed onboarding
          const intendedPath = getIntendedPath();
          return <Navigate to={intendedPath} replace />;
        }
      }
      
      // User is not authenticated, show auth pages
      return <>{children}</>;

    case 'protected':
      // Protected routes require authentication
      if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
      }

      // Demo users can access all protected routes normally
      // The initial redirect to Settings is handled by the /demo route in App.tsx

      // Check if onboarding is required for this route (skip for demo users)
      if (requireOnboarding && !isDemoUser) {
        const hasOnboarding = hasCompletedOnboarding();
        
        if (!hasOnboarding && location.pathname !== '/onboarding') {
          return <Navigate to="/onboarding" replace />;
        }
      }

      // User is authenticated and meets requirements
      return <>{children}</>;

    default:
      return <>{children}</>;
  }
};

export default AuthGuard;