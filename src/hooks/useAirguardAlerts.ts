import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../context/NotificationsContext';
import { Device } from '../types';

interface AlertState {
  deviceId: string;
  alertFlags: number;
  firstAlertTime: number;
  lastReminderTime: number;
  lastNotificationTime: number; // Track when we last sent a notification
  resolutionNotified: boolean; // Track if we've notified about resolution
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const MIN_NOTIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between notifications
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds instead of 10

export function useAirguardAlerts(devices: Device[]) {
  const { addNotification } = useNotifications();
  const alertStatesRef = useRef<Map<string, AlertState>>(new Map());

  useEffect(() => {
    const checkAlerts = async () => {
      const airguards = devices.filter(d => d.type === 'airguard');
      
      for (const device of airguards) {
        const currentAlertFlags = device.airQualityData?.alert ? 1 : 0;
        const deviceId = device.id;
        const previousState = alertStatesRef.current.get(deviceId);

        // No alert currently
        if (currentAlertFlags === 0) {
          // Clear state if alert resolved - only notify once
          if (previousState && !previousState.resolutionNotified) {
            alertStatesRef.current.delete(deviceId);
            
            // Send resolution notification only once
            addNotification({
              title: `${device.name} - Alert Resolved`,
              message: 'All sensors have returned to normal levels.',
              time: 'Just now',
              category: 'alert',
              deviceId,
            });
            
            // Send push notification (try on all platforms, but catch errors gracefully on web)
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${device.name} - Alert Resolved ✅`,
                  body: 'All sensors have returned to normal levels.',
                  data: { deviceId, type: 'resolution' },
                },
                trigger: null,
              });
            } catch (error: any) {
              // On web, notifications may not be available - that's okay, just log it
              if (Platform.OS === 'web' && error?.message?.includes('not available')) {
                // Silently ignore - web doesn't support push notifications
              } else {
                console.warn('[useAirguardAlerts] Failed to schedule notification:', error);
              }
            }
            
            // Mark as notified to prevent duplicate resolution notifications
            previousState.resolutionNotified = true;
          } else if (previousState) {
            // Already notified about resolution, just clear state
            alertStatesRef.current.delete(deviceId);
          }
          continue;
        }

        // Decode alert reasons
        const reasons: string[] = [];
        if (currentAlertFlags & 1) reasons.push('Temperature');
        if (currentAlertFlags & 2) reasons.push('Humidity');
        if (currentAlertFlags & 4) reasons.push('Dust');
        if (currentAlertFlags & 8) reasons.push('Gas');

        const now = Date.now();
        
        // New alert (first time)
        if (!previousState) {
          const message = `⚠️ ${reasons.join(', ')} level${reasons.length > 1 ? 's' : ''} outside safe range!`;
          
          // Add to in-app notifications
          addNotification({
            title: `${device.name} - Alert!`,
            message,
            time: 'Just now',
            category: 'alert',
            deviceId,
          });

          // Send push notification (try on all platforms, but catch errors gracefully on web)
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `🚨 ${device.name} - Alert!`,
                body: message,
                data: { deviceId, alertFlags: currentAlertFlags, type: 'first-alert' },
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });
          } catch (error: any) {
            // On web, notifications may not be available - that's okay, just log it
            if (Platform.OS === 'web' && error?.message?.includes('not available')) {
              // Silently ignore - web doesn't support push notifications
            } else {
              console.warn('[useAirguardAlerts] Failed to schedule notification:', error);
            }
          }

          // Save state
          alertStatesRef.current.set(deviceId, {
            deviceId,
            alertFlags: currentAlertFlags,
            firstAlertTime: now,
            lastReminderTime: now,
            lastNotificationTime: now,
            resolutionNotified: false,
          });
        }
        // Existing alert - check if reminder is needed
        else {
          const timeSinceLastReminder = now - previousState.lastReminderTime;
          const timeSinceLastNotification = now - (previousState.lastNotificationTime || 0);
          
          // Send reminder if it's been an hour and alert is still active
          // AND we haven't sent a notification in the last 5 minutes (throttle)
          if (timeSinceLastReminder >= REMINDER_INTERVAL && timeSinceLastNotification >= MIN_NOTIFICATION_INTERVAL) {
            const durationMinutes = Math.round((now - previousState.firstAlertTime) / 60000);
            const message = `Still active: ${reasons.join(', ')} (${durationMinutes} min)`;
            
            // Add reminder to in-app notifications
            addNotification({
              title: `${device.name} - Reminder`,
              message,
              time: 'Just now',
              category: 'alert',
              deviceId,
              isReminder: true,
            });

            // Send push reminder (try on all platforms, but catch errors gracefully on web)
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `🔔 ${device.name} - Reminder`,
                  body: message,
                  data: { deviceId, alertFlags: currentAlertFlags, type: 'reminder' },
                },
                trigger: null,
              });
            } catch (error: any) {
              // On web, notifications may not be available - that's okay, just log it
              if (Platform.OS === 'web' && error?.message?.includes('not available')) {
                // Silently ignore - web doesn't support push notifications
              } else {
                console.warn('[useAirguardAlerts] Failed to schedule notification:', error);
              }
            }

            // Update last reminder time and notification time
            previousState.lastReminderTime = now;
            previousState.lastNotificationTime = now;
          }

          // Update alert flags if they changed (new sensors triggered)
          if (previousState.alertFlags !== currentAlertFlags) {
            previousState.alertFlags = currentAlertFlags;
          }
        }
      }
    };

    // Check alerts every 10 seconds
    // Check less frequently to reduce spam (every 30 seconds instead of 10)
    const interval = setInterval(checkAlerts, CHECK_INTERVAL);
    checkAlerts(); // Run immediately

    return () => clearInterval(interval);
  }, [devices, addNotification]);

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    };

    requestPermissions();
  }, []);
}
