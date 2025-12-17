import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Expo Go cannot reliably register remote push tokens.
    if ((Constants as any).appOwnership === 'expo') {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    // In some configs, projectId can't be inferred; skip registration instead of crashing UI.
    if (!projectId) {
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    return token;
  } catch (e) {
    console.warn('Push notifications registration failed:', e);
    return null;
  }
}




