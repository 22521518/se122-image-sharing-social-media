import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/api.service';
import { AuthTokensDto, LoginRequestDto, RegisterRequestDto, UserDto } from '../types/api.types';

interface User {
  id: string;
  email: string;
  name?: string;
  hasOnboarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const decodeAndStoreUser = async (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const userData: User = { id: payload.sub, email: payload.email };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await ApiService.post<LoginRequestDto, AuthTokensDto>(
      '/api/auth/login',
      { email, password }
    );

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
    const data = await ApiService.post<RegisterRequestDto, AuthTokensDto>(
      '/api/auth/register',
      { email, password }
    );

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
      await ApiService.patch('/api/users/me/onboarding', {});
      
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

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, refreshAuth, completeOnboarding }}>
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
