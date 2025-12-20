import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  category: 'alert' | 'automation' | 'system';
  deviceId?: string;
  isReminder?: boolean;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
}

const NOTIFICATIONS_STORAGE_KEY = '@veahome_notifications';

const notificationsSeed: NotificationItem[] = [
  {
    id: '1',
    title: 'Motion detected in Garage',
    message: 'Camera Ping-04 spotted unusual movement at 03:14 AM.',
    time: '2 min ago',
    category: 'alert',
  },
  {
    id: '2',
    title: 'Night perimeter enabled',
    message: 'Security automation armed 8 sensors and 3 smart locks.',
    time: '10 min ago',
    category: 'automation',
  },
  {
    id: '3',
    title: 'Energy goal milestone',
    message: 'Household kept usage under 20kWh for the third day.',
    time: '1 hr ago',
    category: 'system',
  },
  {
    id: '4',
    title: 'Living room blinds idle too long',
    message: 'Tap to recalibrate before the afternoon sun hits.',
    time: '3 hr ago',
    category: 'alert',
  },
  {
    id: '5',
    title: 'Morning scene executed',
    message: 'Opened blinds, brewed coffee, and warmed the kitchen.',
    time: '6 hr ago',
    category: 'automation',
  },
  {
    id: '6',
    title: 'Firmware ready for Hub SE-02',
    message: 'Update takes about 4 minutes and requires AC power.',
    time: 'Yesterday',
    category: 'system',
  },
];

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const isDemoMode = token === 'DEMO_TOKEN';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load notifications from storage on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (isDemoMode) {
          setNotifications(notificationsSeed);
        } else {
          const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setNotifications(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoaded(true);
      }
    };
    loadNotifications();
  }, [isDemoMode]);

  // Persist notifications to storage whenever they change (except demo mode)
  useEffect(() => {
    if (!loaded || isDemoMode) return;
    
    const saveNotifications = async () => {
      try {
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }
    };
    saveNotifications();
  }, [notifications, loaded, isDemoMode]);

  const markAllRead = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.length,
      markAllRead,
      setNotifications,
      addNotification,
    }),
    [notifications, markAllRead, addNotification],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
