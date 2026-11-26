import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('bb_access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('bb_refresh_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const saveAuthData = useCallback((tokens, userData) => {
    if (tokens?.access) {
      localStorage.setItem('bb_access_token', tokens.access);
      localStorage.setItem('access_token', tokens.access);
      setAccessToken(tokens.access);
    }
    if (tokens?.refresh) {
      localStorage.setItem('bb_refresh_token', tokens.refresh);
      localStorage.setItem('refresh_token', tokens.refresh);
      setRefreshToken(tokens.refresh);
    }
    if (userData) {
      setUser(userData);
    }
    setError(null);
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('bb_access_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('bb_refresh_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setError(null);
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    async function restoreSession() {
      const storedAccess = localStorage.getItem('bb_access_token');
      const storedRefresh = localStorage.getItem('bb_refresh_token');

      if (!storedAccess) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authService.getProfile(storedAccess);
        setUser(profile);
      } catch {
        // If access token is expired, attempt refresh (once, no loop)
        if (storedRefresh) {
          try {
            const tokenData = await authService.refreshToken(storedRefresh);
            saveAuthData({
              access: tokenData.access,
              refresh: tokenData.refresh || storedRefresh,
            });
            const profile = await authService.getProfile(tokenData.access);
            setUser(profile);
          } catch {
            // Expired, invalid, or blacklisted refresh token -> clear session safely
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [saveAuthData, clearAuthData]);

  /**
   * Login with email and password
   */
  async function login(email, password) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      saveAuthData(data.tokens, data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Customer Registration
   */
  async function registerCustomer(customerData) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.registerCustomer(customerData);
      saveAuthData(data.tokens, data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Seller Registration
   */
  async function registerSeller(sellerData) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.registerSeller(sellerData);
      saveAuthData(data.tokens, data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Logout
   */
  async function logout() {
    setIsLoading(true);
    try {
      if (accessToken && refreshToken) {
        await authService.logout(accessToken, refreshToken).catch(() => {});
      }
    } finally {
      clearAuthData();
      setIsLoading(false);
    }
  }

  /**
   * Update Profile Data
   */
  async function updateProfile(profileData) {
    if (!accessToken) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateProfile(accessToken, profileData);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    error,
    login,
    registerCustomer,
    registerSeller,
    logout,
    updateProfile,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
