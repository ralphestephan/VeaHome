import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/components/Toast';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import { DemoProvider } from './src/context/DemoContext';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

function AppContent() {
  const { mode } = useTheme();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" />
      <AuthProvider>
        <DemoProvider>
          <NotificationsProvider>
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
          </NotificationsProvider>
        </DemoProvider>
      </AuthProvider>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}