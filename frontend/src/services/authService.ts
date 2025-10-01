import { toast } from '@/hooks/use-toast';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  expires_in: number; // Token expiration time in seconds
}

export class AuthError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// Constants
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'connectorpro_token';
const USER_KEY = 'connectorpro_user';
const TOKEN_EXPIRY_KEY = 'connectorpro_token_expiry';

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  /**
   * Get stored token from localStorage
   */
  getToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      // Check if token is expired
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (expiry && new Date().getTime() > parseInt(expiry)) {
        this.clearAuthData();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Get stored user from localStorage
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing stored user:', error);
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Store authentication data
   */
  private storeAuthData(token: string, user: User, expiresIn?: number): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      
      // Set token expiry based on backend response or fallback to 15 minutes
      const expirationSeconds = expiresIn || 900; // Default to 15 minutes (900 seconds)
      const expiryTime = new Date().getTime() + (expirationSeconds * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      // Clear other app data
      localStorage.removeItem('connectorpro_onboarding_complete');
      localStorage.removeItem('connectorpro_target_companies');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  /**
   * Make authenticated API request
   */
  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      this.clearAuthData();
      throw new AuthError('Session expired. Please log in again.', 401);
    }

    return response;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      console.log('🔍 [DEBUG] Login attempt started');
      console.log('🔍 [DEBUG] Email:', email);
      console.log('🔍 [DEBUG] Password length:', password.length);
      console.log('🔍 [DEBUG] API URL:', `${API_BASE_URL}/api/v1/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔍 [DEBUG] Login response status:', response.status);
      console.log('🔍 [DEBUG] Login response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('🔍 [DEBUG] Login error response:', errorData);
        throw new AuthError(
          errorData.detail || 'Login failed. Please check your credentials.',
          response.status
        );
      }

      const data: LoginResponse = await response.json();
      console.log('🔍 [DEBUG] Login successful, user data:', data.user);
      
      // Store authentication data with backend expiration time
      this.storeAuthData(data.access_token, data.user, data.expires_in);

      return {
        user: data.user,
        token: data.access_token,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        console.log('🔍 [DEBUG] AuthError thrown:', error.message);
        throw error;
      }
      
      console.error('🔍 [DEBUG] Unexpected login error:', error);
      throw new AuthError('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Register user
   */
  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle FastAPI validation errors (422)
        if (response.status === 422 && errorData.detail && Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map((error: any) => {
            if (error.msg) {
              return error.msg;
            }
            return `${error.loc?.join(' ')} - ${error.msg || 'Validation error'}`;
          }).join('. ');
          
          throw new AuthError(
            validationErrors || 'Please check your input and try again.',
            response.status
          );
        }
        
        throw new AuthError(
          errorData.detail || 'Registration failed. Please try again.',
          response.status
        );
      }

      const data: LoginResponse = await response.json();
      
      // Store authentication data with backend expiration time
      this.storeAuthData(data.access_token, data.user, data.expires_in);

      return {
        user: data.user,
        token: data.access_token,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      console.error('Registration error:', error);
      throw new AuthError('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Clear local data immediately
      this.clearAuthData();
      
      // Note: Backend doesn't have a logout endpoint since JWT is stateless
      // In a production app, you might want to add token blacklisting
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if there's an error
      this.clearAuthData();
    }
  }

  /**
   * Get current user info from backend
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/v1/auth/me');

      if (!response.ok) {
        throw new AuthError('Failed to get user information', response.status);
      }

      const data = await response.json();
      const user = data.user;

      // Update stored user data
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }

      return user;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      console.error('Get current user error:', error);
      throw new AuthError('Failed to get user information');
    }
  }

  /**
   * Refresh token (for future implementation)
   * Note: Current backend doesn't have refresh token endpoint
   */
  async refreshToken(): Promise<string> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performTokenRefresh(): Promise<string> {
    // For now, just return the current token since backend doesn't support refresh
    // In a real implementation, you would call a refresh endpoint
    const currentToken = this.getToken();
    if (!currentToken) {
      throw new AuthError('No token to refresh', 401);
    }
    
    // Check if we can get current user (validates token)
    try {
      await this.getCurrentUser();
      return currentToken;
    } catch (error) {
      // Token is invalid, clear auth data
      this.clearAuthData();
      throw new AuthError('Token refresh failed', 401);
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      if (error instanceof AuthError && error.status === 401) {
        this.clearAuthData();
      }
      return false;
    }
  }

  /**
   * Handle authentication errors globally
   */
  handleAuthError(error: AuthError): void {
    if (error.status === 401) {
      this.clearAuthData();
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;