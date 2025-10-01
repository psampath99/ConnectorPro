import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

interface AuthFlowOptions {
  redirectAfterLogin?: string;
  redirectAfterSignup?: string;
  requireOnboarding?: boolean;
}

export const useAuthFlow = (options: AuthFlowOptions = {}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Check if user has completed onboarding
   */
  const hasCompletedOnboarding = useCallback((): boolean => {
    const onboardingData = storage.getOnboardingData();
    return onboardingData.onboardingComplete === true;
  }, []);

  /**
   * Get the intended redirect path after authentication
   */
  const getIntendedPath = useCallback((): string => {
    // Check for stored redirect path
    const storedPath = sessionStorage.getItem('connectorpro_redirect_after_login');
    if (storedPath && storedPath !== '/login' && storedPath !== '/signup') {
      sessionStorage.removeItem('connectorpro_redirect_after_login');
      return storedPath;
    }

    // Check location state
    const fromPath = location.state?.from?.pathname;
    if (fromPath && fromPath !== '/login' && fromPath !== '/signup') {
      return fromPath + (location.state?.from?.search || '');
    }

    return '/dashboard';
  }, [location.state]);

  /**
   * Handle post-authentication redirect logic
   */
  const handlePostAuthRedirect = useCallback((isNewUser: boolean = false) => {
    if (!isAuthenticated || !user) return;

    const intendedPath = getIntendedPath();
    const hasOnboarding = hasCompletedOnboarding();

    // Check if user has any stored data (indicating they're a return user)
    const userData = localStorage.getItem('connectorpro_user');
    const isReturnUser = !!userData;

    if (isNewUser && !isReturnUser) {
      // Truly new users go to settings page (as per requirements)
      navigate('/settings', { replace: true });
      toast({
        title: "Welcome to ConnectorPro!",
        description: "Let's set up your profile in settings.",
      });
    } else {
      // Return users or users with existing data go to dashboard
      if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/onboarding') {
        navigate('/dashboard', { replace: true });
        toast({
          title: "Welcome back!",
          description: "Redirected to dashboard",
        });
      }
    }
  }, [isAuthenticated, user, navigate, location.pathname, getIntendedPath, hasCompletedOnboarding]);

  /**
   * Handle authentication state changes
   * Only run when authentication status actually changes, not on every render
   */
  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated and on auth pages, redirect appropriately
    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated, isLoading]); // Removed location.pathname and handlePostAuthRedirect to prevent re-renders

  /**
   * Redirect to login with current path stored
   */
  const redirectToLogin = useCallback((message?: string) => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/login' && currentPath !== '/signup') {
      sessionStorage.setItem('connectorpro_redirect_after_login', currentPath);
    }
    
    navigate('/login', { replace: true });
    
    if (message) {
      toast({
        title: "Authentication Required",
        description: message,
        variant: "destructive",
      });
    }
  }, [navigate, location]);

  /**
   * Redirect to signup with current path stored
   */
  const redirectToSignup = useCallback((message?: string) => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/login' && currentPath !== '/signup') {
      sessionStorage.setItem('connectorpro_redirect_after_login', currentPath);
    }
    
    navigate('/signup', { replace: true });
    
    if (message) {
      toast({
        title: "Account Required",
        description: message,
      });
    }
  }, [navigate, location]);

  /**
   * Check if user should be redirected away from auth pages
   */
  const shouldRedirectFromAuthPages = useCallback((): boolean => {
    return isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup');
  }, [isAuthenticated, location.pathname]);

  /**
   * Check if user needs onboarding
   */
  const needsOnboarding = useCallback((): boolean => {
    return isAuthenticated && !hasCompletedOnboarding();
  }, [isAuthenticated, hasCompletedOnboarding]);

  return {
    hasCompletedOnboarding,
    getIntendedPath,
    handlePostAuthRedirect,
    redirectToLogin,
    redirectToSignup,
    shouldRedirectFromAuthPages,
    needsOnboarding,
  };
};

export default useAuthFlow;