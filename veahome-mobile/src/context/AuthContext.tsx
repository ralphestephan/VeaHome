import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiClient, AuthApi } from '../services/api';
import Constants from 'expo-constants';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  homeId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  loginDemo: () => Promise<void>;
  homes: { id: string; name: string }[];
  currentHomeId: string | null;
  setCurrentHomeId: (homeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [homes, setHomes] = useState<{ id: string; name: string }[]>([]);
  const [currentHomeId, _setCurrentHomeId] = useState<string | null>(null);

  const getToken = async () => token;
  const client = useMemo(() => getApiClient(getToken), [token]);
  const auth = useMemo(() => AuthApi(client), [client]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('auth_token');
        const storedHome = await AsyncStorage.getItem('current_home_id');
        // Only restore token if it's not a demo token
        if (stored && stored !== 'DEMO_TOKEN') {
          setToken(stored);
        } else if (stored === 'DEMO_TOKEN') {
          // Clear demo token - user must explicitly login
          await AsyncStorage.removeItem('auth_token');
        }
        if (storedHome) _setCurrentHomeId(storedHome);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshMe = async () => {
    if (!token) return;
    const { data } = await auth.me();
    setUser(data.user as AuthUser);
  };

  const login = async (email: string, password: string) => {
    const { data } = await auth.login(email, password);
    const t = data.token as string;
    setToken(t);
    await AsyncStorage.setItem('auth_token', t);
    await refreshMe();
    // Optionally load homes from backend when /auth/me returns homes list
    if (data.homes) setHomes(data.homes);
    if (data.user?.homeId) {
      _setCurrentHomeId(data.user.homeId);
      await AsyncStorage.setItem('current_home_id', data.user.homeId);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await auth.register(name, email, password);
    const t = data.token as string;
    setToken(t);
    await AsyncStorage.setItem('auth_token', t);
    await refreshMe();
    if (data.homes) setHomes(data.homes);
    if (data.user?.homeId) {
      _setCurrentHomeId(data.user.homeId);
      await AsyncStorage.setItem('current_home_id', data.user.homeId);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setHomes([]);
    _setCurrentHomeId(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('current_home_id');
  };

  const loginDemo = async () => {
    const demoToken = 'DEMO_TOKEN';
    const demoUser: AuthUser = {
      id: 'demo-user',
      name: 'VeaHome Demo',
      email: 'demo@veahome.app',
      homeId: 'demo-home',
    };
    setToken(demoToken);
    setUser(demoUser);
    await AsyncStorage.setItem('auth_token', demoToken);
    _setCurrentHomeId('demo-home');
    await AsyncStorage.setItem('current_home_id', 'demo-home');
  };

  const setCurrentHomeId = async (homeId: string) => {
    _setCurrentHomeId(homeId);
    await AsyncStorage.setItem('current_home_id', homeId);
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshMe,
    loginDemo,
    homes,
    currentHomeId,
    setCurrentHomeId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


