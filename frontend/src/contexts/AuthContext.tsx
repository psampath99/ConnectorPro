import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, User, AuthError } from '@/services/authService';
import { storage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; isNewUser: boolean }>;
  loginAsDemo: () => Promise<{ success: boolean; isNewUser: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean; // New state to track initial auth check
  isAuthenticated: boolean;
  isDemoUser: boolean;
  refreshUser: () => Promise<void>;
  handleTokenExpiration: () => void;
  isTokenExpiring: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false); // Track initial auth load
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isTokenExpiring, setIsTokenExpiring] = useState(false);
  const navigate = useNavigate();

  // Instrumentation: Track AuthProvider mount/unmount cycles
  useEffect(() => {
    console.log('[MOUNT] AuthProvider');
    return () => console.log('[UNMOUNT] AuthProvider');
  }, []);

  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if demo mode is enabled
      const demoMode = localStorage.getItem('connectorpro_demo_mode');
      if (demoMode === 'true') {
        const demoUser = {
          id: 'demo-user-sampath',
          email: 'sampath.prema@gmail.com',
          name: 'Sampath Prema',
          linkedinProfile: 'https://www.linkedin.com/in/premasampath/'
        };
        setUser(demoUser);
        setIsAuthenticated(true);
        setIsDemoUser(true);
        return;
      }

      const sessionIsValid = await authService.validateSession();
      if (sessionIsValid) {
        const currentUser = authService.getUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setIsDemoUser(false);
        } else {
          // This case should ideally not happen if session is valid
          // but as a fallback, we clear the state.
          authService.clearAuthData();
          setUser(null);
          setIsAuthenticated(false);
          setIsDemoUser(false);
        }
      } else {
        authService.clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        setIsDemoUser(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      authService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      setIsDemoUser(false);
    } finally {
      setIsLoading(false);
      setIsInitialized(true); // Mark auth as initialized
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (email: string, password: string): Promise<{ success: boolean; isNewUser?: boolean }> => {
    // Don't set global loading state during login to prevent form remounting
    try {
      const { user: loggedInUser } = await authService.login(email, password);
      
      setUser(loggedInUser);
      setIsAuthenticated(true);
      
      // For returning users (successful login), mark onboarding as complete
      // This ensures they go directly to dashboard instead of onboarding
      const onboardingData = storage.getOnboardingData();
      const isNewUser = !onboardingData.onboardingComplete;
      
      // If user successfully logs in, treat them as a returning user
      // and mark onboarding as complete so they skip onboarding flow
      if (!onboardingData.onboardingComplete) {
        localStorage.setItem('connectorpro_onboarding_complete', 'true');
      }
      
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${loggedInUser.name}`,
      });
      
      // Always treat login users as returning users (not new users)
      return { success: true, isNewUser: false };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof AuthError) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      
      return { success: false };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; isNewUser: boolean }> => {
    // Don't set global loading state during registration to prevent form remounting
    try {
      const { user: registeredUser } = await authService.register(name, email, password);
      
      setUser(registeredUser);
      setIsAuthenticated(true);
      
      toast({
        title: "Welcome to ConnectorPro!",
        description: `Account created successfully for ${registeredUser.name}`,
      });
      
      // New registrations are always new users
      return { success: true, isNewUser: true };
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof AuthError) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      
      return { success: false, isNewUser: true };
    }
  };

  const loginAsDemo = async (): Promise<{ success: boolean; isNewUser: boolean }> => {
    try {
      console.log('🔍 [DEBUG] Starting demo login process');
      
      // Create comprehensive demo user data using Sampath Prema's account
      const demoUser = {
        id: 'demo-user-sampath',
        email: 'sampath.prema@gmail.com',
        name: 'Sampath Prema',
        role: 'job_seeker',
        linkedinProfile: 'https://www.linkedin.com/in/premasampath/',
        preferences: {
          draftTone: 'professional',
          reminderFrequency: 7,
          commonalityOrder: ['employer', 'education', 'mutual', 'event']
        }
      };
      
      // Set demo mode flags FIRST
      localStorage.setItem('connectorpro_demo_mode', 'true');
      localStorage.setItem('connectorpro_onboarding_complete', 'true');
      localStorage.setItem('connectorpro_user', JSON.stringify(demoUser));
      localStorage.setItem('connectorpro_token', 'demo-token-' + Date.now());
      
      // Set demo target companies
      const demoTargetCompanies = ['Google', 'Meta', 'Apple', 'Microsoft', 'Amazon'];
      localStorage.setItem('connectorpro_target_companies', JSON.stringify(demoTargetCompanies));
      
      // Set demo LinkedIn profile URL
      localStorage.setItem('connectorpro_linkedin_profile_url', 'https://www.linkedin.com/in/premasampath/');
      
      // Update state immediately and synchronously
      setUser(demoUser);
      setIsAuthenticated(true);
      setIsDemoUser(true);
      
      console.log('🔍 [DEBUG] Demo user state set:', { demoUser, isAuthenticated: true, isDemoUser: true });
      
      toast({
        title: "Welcome to Demo Mode!",
        description: "You're now exploring ConnectorPro as a demo user.",
      });
      
      // Only navigate if we're not already on the demo route
      if (window.location.pathname !== '/demo') {
        navigate('/demo', { replace: true });
      }
      
      return { success: true, isNewUser: false };
    } catch (error) {
      console.error('Demo login error:', error);
      toast({
        title: "Demo Login Failed",
        description: "Unable to start demo mode. Please try again.",
        variant: "destructive",
      });
      return { success: false, isNewUser: false };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (!isDemoUser) {
        await authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsDemoUser(false);
      setIsTokenExpiring(false);
      
      // Clear demo mode
      localStorage.removeItem('connectorpro_demo_mode');
      
      // Clear session storage
      sessionStorage.removeItem('connectorpro_redirect_after_login');
      
      // Broadcast logout to other tabs
      localStorage.setItem('connectorpro_logout_event', Date.now().toString());
      
      toast({
        title: "Logged out",
        description: isDemoUser ? "Demo session ended." : "You have been successfully logged out.",
      });
      
      navigate('/login', { replace: true });
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      if (!isAuthenticated) return;
      
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      
      if (error instanceof AuthError && error.status === 401) {
        // Token expired, logout user
        await logout();
      }
    }
  }, [isAuthenticated]);

  // Handle token expiration with user notification
  const handleTokenExpiration = useCallback(() => {
    setIsTokenExpiring(true);
    
    toast({
      title: "Session Expiring",
      description: "Your session will expire in 2 minutes. Please save your work.",
      variant: "destructive",
    });

    // Auto-logout after 2 minutes if no action taken
    setTimeout(() => {
      if (isAuthenticated) {
        logout();
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive",
        });
      }
    }, 2 * 60 * 1000); // 2 minutes
  }, [isAuthenticated]);

  // Auto-refresh user data and check token expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = () => {
      const token = authService.getToken();
      if (!token) return;

      const expiry = localStorage.getItem('connectorpro_token_expiry');
      if (expiry) {
        const expiryTime = parseInt(expiry);
        const now = new Date().getTime();
        const timeUntilExpiry = expiryTime - now;

        // Warn user 2 minutes before expiration (since tokens now expire in 15 minutes)
        if (timeUntilExpiry <= 2 * 60 * 1000 && timeUntilExpiry > 0 && !isTokenExpiring) {
          handleTokenExpiration();
        }
      }
    };

    // Check immediately and then every minute
    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, [isAuthenticated, isTokenExpiring, handleTokenExpiration]);

  // Handle cross-tab authentication state synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'connectorpro_token' && !e.newValue) {
        // Token was removed, logout user
        setUser(null);
        setIsAuthenticated(false);
        setIsTokenExpiring(false);
      } else if (e.key === 'connectorpro_logout_event') {
        // Logout event from another tab
        setUser(null);
        setIsAuthenticated(false);
        setIsTokenExpiring(false);
      } else if (e.key === 'connectorpro_token' && e.newValue) {
        // Token was added/updated, refresh auth state
        initializeAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initializeAuth]);

  const value: AuthContextType = React.useMemo(() => ({
    user,
    login,
    register,
    loginAsDemo,
    logout,
    isLoading,
    isInitialized,
    isAuthenticated,
    isDemoUser,
    refreshUser,
    handleTokenExpiration,
    isTokenExpiring,
  }), [user, login, register, loginAsDemo, logout, isLoading, isInitialized, isAuthenticated, isDemoUser, refreshUser, handleTokenExpiration, isTokenExpiring]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};