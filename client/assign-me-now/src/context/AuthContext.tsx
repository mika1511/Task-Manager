import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAccessToken } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User, refresh?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // If we have an access token, try to get user. If it fails (401), the interceptor will handle refresh.
        const userResponse = await api.get('/auth/user');
        if (userResponse.data) {
          setUser(userResponse.data);
        }
      } catch (error) {
        console.log("Session re-hydration failed.");
        // If refresh also failed inside the interceptor, we'll be here
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (token: string, userData?: User, refresh?: string) => {
    setAccessToken(token);
    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    }
    
    if (userData) {
      setUser(userData);
      return;
    }
    
    try {
        const userRes = await api.get('/auth/user');
        if (userRes.data) {
            setUser(userRes.data);
        }
    } catch (e) {
        console.error("Failed to fetch user after login", e);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken }, { withCredentials: true });
    } catch (e) {
      console.error("Logout request failed:", e);
    } finally {
      setAccessToken('');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
