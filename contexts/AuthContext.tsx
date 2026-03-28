import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setUser(data);
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    const redirectUrl = Platform.OS === 'web'
      ? window.location.origin
      : process.env.EXPO_PUBLIC_SUPABASE_URL || '';

    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const hash = url.hash;
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        if (sessionId) {
          await exchangeSession(sessionId);
        }
      }
    }
  };

  const exchangeSession = async (sessionId: string) => {
    try {
      const response = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
        headers: { 'X-Session-ID': sessionId }
      });

      if (response.ok) {
        const authData = await response.json();
        const userId = `user_${Math.random().toString(36).substr(2, 12)}`;
        const newUser = {
          user_id: userId,
          email: authData.email,
          name: authData.name || 'Usuario',
          picture: authData.picture
        };

        await supabase.from('users').insert([newUser]);
        setUser(newUser);
      }
    } catch (e) {
      console.error('Session exchange error:', e);
    }
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
