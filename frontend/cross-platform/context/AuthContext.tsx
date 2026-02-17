import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ApiService } from '../services/api.service';
import { AuthTokensDto, LoginRequestDto, RegisterRequestDto } from '../types/api.types';
import { extractUserFromToken, getTokenTimeRemaining, isTokenExpired } from '../utils/jwt.utils';

interface User {
  id: string;
  email: string;
  avatarUrl?: string;
  name?: string;
  hasOnboarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAuthenticated = !!user && !!accessToken;

  useEffect(() => {
    loadStoredAuth();

    // Register callback for API 401 responses
    ApiService.setOnAuthFailure(() => {
      console.log('API returned 401, logging out');
      logout();
    });

    return () => {
      // Clean up callback on unmount
      ApiService.setOnAuthFailure(null);
    };
  }, []);

  // Periodic token validation
  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      // Clear interval if not authenticated
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      return;
    }

    // Check token immediately
    checkSessionValidity();

    // Set up periodic check every 60 seconds
    tokenCheckIntervalRef.current = setInterval(() => {
      checkSessionValidity();
    }, 60000);

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
    };
  }, [accessToken, isAuthenticated]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          console.log('Stored token is expired, clearing auth state');
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('user');
          setAccessToken(null);
          setUser(null);
        } else {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const decodeAndStoreUser = async (token: string) => {
    try {
      const userInfo = extractUserFromToken(token);
      if (userInfo) {
        const userData: User = { id: userInfo.id, email: userInfo.email };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await ApiService.post<LoginRequestDto, AuthTokensDto>('/api/auth/login', {
      email,
      password,
    });

    if (data.accessToken) {
      await AsyncStorage.setItem('accessToken', data.accessToken);
      setAccessToken(data.accessToken);

      // Use user data from response if available, otherwise decode from token
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        await decodeAndStoreUser(data.accessToken);
      }
    } else {
      throw new Error('Invalid response: missing access token');
    }
  };

  const register = async (email: string, password: string) => {
    const data = await ApiService.post<RegisterRequestDto, AuthTokensDto>('/api/auth/register', {
      email,
      password,
    });

    if (data.accessToken) {
      await AsyncStorage.setItem('accessToken', data.accessToken);
      setAccessToken(data.accessToken);

      // Use user data from response if available, otherwise decode from token
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        await decodeAndStoreUser(data.accessToken);
      }
    } else {
      throw new Error('Invalid response: missing access token');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('user');
    setAccessToken(null);
    setUser(null);
  };

  // Reload auth state from storage (used after OAuth callback)
  const refreshAuth = async () => {
    setIsLoading(true); // Set loading to true before reloading
    await loadStoredAuth();
  };

  // Mark user as onboarded
  const completeOnboarding = async () => {
    try {
      await ApiService.patch('/api/users/me/onboarding', {}, accessToken);

      // Update local state
      if (user) {
        const updatedUser = { ...user, hasOnboarded: true };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Optimistic update - proceed even if API call fails
      if (user) {
        const updatedUser = { ...user, hasOnboarded: true };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
  };

  // Check if current session is valid
  const checkSessionValidity = async (): Promise<boolean> => {
    if (!accessToken) {
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      console.log('Session expired, logging out');
      await logout();
      return false;
    }

    // Log remaining time for debugging
    const remaining = getTokenTimeRemaining(accessToken);
    if (remaining < 300) {
      // Less than 5 minutes
      console.log(`Token expires in ${Math.floor(remaining / 60)} minutes`);
    }

    return true;
  };

  // Update user data (for profile updates like avatar, name)
  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Refresh user profile from API
  const refreshUserProfile = async () => {
    if (!accessToken || !user) return;
    
    try {
      const profileData = await ApiService.get<{
        id: string;
        email: string;
        name?: string;
        avatarUrl?: string;
        hasOnboarded?: boolean;
      }>('/api/users/me', accessToken);
      
      if (profileData) {
        const updatedUser: User = {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          avatarUrl: profileData.avatarUrl,
          hasOnboarded: profileData.hasOnboarded ?? user.hasOnboarded,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
        completeOnboarding,
        checkSessionValidity,
        updateUser,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
