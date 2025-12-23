import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import type { ThemeColors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';

interface WizardStep {
  step: 'intro' | 'connect' | 'credentials' | 'provisioning' | 'pairing' | 'success';
}

export default function DeviceProvisioningWizard({ route }: any) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const homeId = user?.homeId;
  // Ensure we have valid colors with fallback
  const safeColors = { ...Colors, ...colors };
  const styles = useMemo(() => createStyles(safeColors), [colors]);
  const deviceType = route.params?.deviceType || 'SmartMonitor';
  const roomId = route.params?.roomId;
  const hubId = route.params?.hubId;
  
  const [currentStep, setCurrentStep] = useState<WizardStep['step']>('intro');
  const [homeWifiSSID, setHomeWifiSSID] = useState('');
  const [homeWifiPassword, setHomeWifiPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [deviceConnected, setDeviceConnected] = useState(false);

  // Check if connected to device AP
  useEffect(() => {
    if (currentStep === 'connect') {
      const interval = setInterval(async () => {
        const connected = await checkDeviceConnection();
        if (connected) {
          setDeviceConnected(true);
          setStatusMessage('Connected to device');
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Check if device is reachable at 192.168.4.1
  const checkDeviceConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('http://192.168.4.1/', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  // Send credentials to device
  const provisionDevice = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Sending WiFi credentials...');

      const response = await fetch('http://192.168.4.1/api/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssid: homeWifiSSID,
          password: homeWifiPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage('Credentials saved to device');
        setCurrentStep('pairing');
        
        // Device will restart - wait then try to pair
        setTimeout(() => {
          completeDevicePairing(result.deviceId);
        }, 8000);
      } else {
        throw new Error(result.error || 'Provisioning failed');
      }
    } catch (error: any) {
      setIsProcessing(false);
      Alert.alert('Provisioning Error', error.message || 'Failed to send credentials to device');
    }
  };

  // Add device to backend after it connects to home WiFi
  const completeDevicePairing = async (deviceId: number) => {
    try {
      setStatusMessage('Waiting for device to connect to your WiFi...');
      
      // Wait for device to connect to home WiFi and start sending MQTT
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (!homeId) {
        throw new Error('No home selected');
      }

      setStatusMessage('Creating device in your home...');
      
      // Create hub/device in backend
      const client = getApiClient(async () => token);
      const hubApi = HubApi(client);
      
      const response = await hubApi.addHub(homeId, {
        name: `SmartMonitor ${deviceId}`,
        hubType: 'airguard',
        metadata: {
          smartMonitorId: deviceId,
          deviceType: 'SmartMonitor',
          wifiConnected: true,
        },
        roomId: roomId || undefined,
      });

      console.log('[DeviceProvisioningWizard] Device created:', response.data);
      
      setStatusMessage('Device connected successfully!');
      setCurrentStep('success');
    } catch (error: any) {
      console.error('[DeviceProvisioningWizard] Pairing error:', error);
      Alert.alert(
        'Pairing Error', 
        error?.response?.data?.message || error.message || 'Device connected to WiFi but failed to pair with your account.'
      );
      setCurrentStep('success'); // Still show success since WiFi config worked
    } finally {
      setIsProcessing(false);
    }
  };

  // Open WiFi settings
  const openWiFiSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:WIFI');
    } else {
      Linking.sendIntent('android.settings.WIFI_SETTINGS');
    }
  };

  const renderIntroStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconCircleText}>1</Text>
      </View>
      <Text style={styles.title}>Add {deviceType}</Text>
      <Text style={styles.description}>
        This wizard will guide you through connecting your device to WiFi.
      </Text>
      <Text style={styles.instructions}>
        Make sure your device is powered on and showing "SETUP MODE" on its display.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep('connect')}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnectStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconCircleText}>2</Text>
      </View>
      <Text style={styles.title}>Connect to Device</Text>
      <Text style={styles.description}>
        Follow these steps to connect to your device:
      </Text>
      
      <View style={styles.instructionsList}>
        <Text style={styles.instructionStep}>1. Go to your phone's WiFi settings</Text>
        <Text style={styles.instructionStep}>2. Look for network:</Text>
        <View style={styles.wifiNameBox}>
          <Text style={styles.wifiNameText}>SmartMonitor_Setup</Text>
        </View>
        <Text style={styles.instructionStep}>3. Connect to this network (no password needed)</Text>
        <Text style={styles.instructionStep}>4. Return to this app and tap Continue</Text>
      </View>
      
      {deviceConnected && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Connected to device</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep('credentials')}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconCircleText}>3</Text>
      </View>
      <Text style={styles.title}>Home WiFi Credentials</Text>
      <Text style={styles.description}>
        Enter your home WiFi details. The device will connect to this network.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="WiFi Network Name (SSID)"
        placeholderTextColor={colors.mutedForeground}
        value={homeWifiSSID}
        onChangeText={setHomeWifiSSID}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="WiFi Password"
        placeholderTextColor={colors.mutedForeground}
        value={homeWifiPassword}
        onChangeText={setHomeWifiPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!homeWifiSSID || !homeWifiPassword) && styles.buttonDisabled
        ]}
        onPress={() => setCurrentStep('provisioning')}
        disabled={!homeWifiSSID || !homeWifiPassword}
      >
        <Text style={styles.primaryButtonText}>Send to Device</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProvisioningStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconCircleText}>4</Text>
      </View>
      <Text style={styles.title}>Configure Device</Text>
      <Text style={styles.description}>
        Sending WiFi credentials to your device.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Network:</Text>
        <Text style={styles.infoValue}>{homeWifiSSID}</Text>
      </View>

      {statusMessage && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
        onPress={provisionDevice}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send to Device</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderPairingStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Connecting...</Text>
      <Text style={styles.description}>{statusMessage}</Text>
      <Text style={styles.note}>
        The device is restarting and connecting to your home WiFi. This may take 10-15 seconds.
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
        <Text style={styles.iconCircleText}>✓</Text>
      </View>
      <Text style={styles.title}>Setup Complete!</Text>
      <Text style={styles.description}>
        Your {deviceType} is now connected and ready to use.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntroStep();
      case 'connect':
        return renderConnectStep();
      case 'credentials':
        return renderCredentialsStep();
      case 'provisioning':
        return renderProvisioningStep();
      case 'pairing':
        return renderPairingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderIntroStep();
    }
  };

  const getStepNumber = () => {
    const steps = ['intro', 'connect', 'credentials', 'provisioning', 'pairing', 'success'];
    return steps.indexOf(currentStep) + 1;
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      {currentStep !== 'success' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step {getStepNumber()} of 5</Text>
        </View>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {renderCurrentStep()}
      </View>

      {/* Back button */}
      {currentStep === 'intro' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    progressContainer: {
      padding: 20,
      paddingTop: 60,
      alignItems: 'center',
    },
    progressText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    stepContainer: {
      alignItems: 'center',
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    iconCircleSuccess: {
      backgroundColor: colors.success,
    },
    iconCircleText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#fff',
    },
    instructionsList: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginVertical: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionStep: {
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 12,
      lineHeight: 22,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 12,
      textAlign: 'center',
    },
    description: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    instructions: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    note: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
      fontStyle: 'italic',
    },
    wifiNameBox: {
      backgroundColor: colors.card,
      paddingVertical: 20,
      paddingHorizontal: 32,
      borderRadius: 12,
      marginVertical: 24,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    wifiNameText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    input: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoBox: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      width: '100%',
      marginVertical: 20,
    },
    infoLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      color: colors.foreground,
      fontWeight: '600',
    },
    statusBox: {
      backgroundColor: colors.info + '20',
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    statusText: {
      fontSize: 14,
      color: colors.info,
      textAlign: 'center',
    },
    successBox: {
      backgroundColor: colors.success + '20',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    successText: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 48,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    textButton: {
      paddingVertical: 12,
      marginTop: 16,
    },
    textButtonText: {
      color: colors.mutedForeground,
      fontSize: 15,
    },
    backButton: {
      padding: 20,
      alignItems: 'center',
    },
    backButtonText: {
      color: colors.mutedForeground,
      fontSize: 16,
    },
  });
}
