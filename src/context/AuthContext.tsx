import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const getToken = async () => tokenRef.current;
  const client = useMemo(() => getApiClient(getToken), [token]);
  const auth = useMemo(() => AuthApi(client), [client]);

  const unwrap = <T,>(envelope: any): T => {
    if (envelope?.success === false) {
      throw new Error(envelope?.error || envelope?.message || 'Request failed');
    }
    return (envelope?.data ?? envelope) as T;
  };

  const normalizeStoredToken = (raw: string | null): string | null => {
    if (!raw) return null;
    const t = raw.trim();
    if (!t) return null;
    if (t === 'null' || t === 'undefined') return null;
    return t;
  };

  useEffect(() => {
    (async () => {
      try {
        const storedRaw = await AsyncStorage.getItem('auth_token');
        const stored = normalizeStoredToken(storedRaw);
        const storedHome = await AsyncStorage.getItem('current_home_id');
        // Only restore token if it's not a demo token
        if (stored && stored !== 'DEMO_TOKEN') {
          setToken(stored);
          if (storedHome) _setCurrentHomeId(storedHome);

          // Hydrate the real user immediately; if the token is stale, clear it.
          try {
            const bootClient = getApiClient(async () => stored);
            const bootAuth = AuthApi(bootClient);
            const res = await bootAuth.me();
            const payload = unwrap<{ user: AuthUser; homes?: { id: string; name: string }[] }>(res.data);
            setUser(payload.user);
            if (payload.homes) setHomes(payload.homes);
            if (payload.user?.homeId) {
              _setCurrentHomeId(payload.user.homeId);
              await AsyncStorage.setItem('current_home_id', payload.user.homeId);
            }
          } catch {
            setUser(null);
            setToken(null);
            setHomes([]);
            _setCurrentHomeId(null);
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('current_home_id');
          }
        } else if (stored === 'DEMO_TOKEN') {
          // Clear demo token - user must explicitly login
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('current_home_id');
          _setCurrentHomeId(null);
          setUser(null);
          setToken(null);
          setHomes([]);
        } else {
          // No token -> don't keep stale home selection around
          await AsyncStorage.removeItem('current_home_id');
          _setCurrentHomeId(null);
          setUser(null);
          setToken(null);
          setHomes([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshMe = async () => {
    if (!token) return;
    const res = await auth.me();
    const payload = unwrap<{ user: AuthUser; homes?: { id: string; name: string }[] }>(res.data);
    setUser(payload.user);
    if (payload.homes) setHomes(payload.homes);
    if (payload.user?.homeId) {
      _setCurrentHomeId(payload.user.homeId);
      await AsyncStorage.setItem('current_home_id', payload.user.homeId);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    const payload = unwrap<{ token: string; user?: AuthUser; homes?: { id: string; name: string }[] }>(res.data);
    const t = payload.token;
    if (!t) throw new Error('Login failed: missing token');
    setToken(t);
    await AsyncStorage.setItem('auth_token', t);
    if (payload.user) setUser(payload.user);
    if (payload.homes) setHomes(payload.homes);
    if (payload.user?.homeId) {
      _setCurrentHomeId(payload.user.homeId);
      await AsyncStorage.setItem('current_home_id', payload.user.homeId);
    }
    if (!payload.user) await refreshMe();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await auth.register(name, email, password);
    const payload = unwrap<{ token: string; user?: AuthUser; homes?: { id: string; name: string }[] }>(res.data);
    const t = payload.token;
    if (!t) throw new Error('Sign up failed: missing token');
    setToken(t);
    await AsyncStorage.setItem('auth_token', t);
    if (payload.user) setUser(payload.user);
    if (payload.homes) setHomes(payload.homes);
    if (payload.user?.homeId) {
      _setCurrentHomeId(payload.user.homeId);
      await AsyncStorage.setItem('current_home_id', payload.user.homeId);
    }
    if (!payload.user) await refreshMe();
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


