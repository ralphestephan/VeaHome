import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import NetInfo from '@react-native-community/netinfo';

const DEVICE_AP_SSID = 'SmartMonitor_Setup';
const DEVICE_API_URL = 'http://192.168.4.1/api/provision';

export default function DeviceProvisioningESPTouch({ route }: any) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const deviceType = route.params?.deviceType || 'AirGuard';
  
  const [step, setStep] = useState<'intro' | 'connect' | 'credentials' | 'provisioning' | 'success'>('intro');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [homeWifiSSID, setHomeWifiSSID] = useState('');
  const [connectedToDevice, setConnectedToDevice] = useState(false);

  // Auto-detect home WiFi on mount
  useEffect(() => {
    checkCurrentWiFi();
  }, []);

  // Monitor WiFi connection status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.type === 'wifi' && state.details?.ssid) {
        const ssid = state.details.ssid;
        console.log('[WiFi] Connected to:', ssid);
        
        // Check if connected to device AP
        if (ssid === DEVICE_AP_SSID || ssid.includes('SmartMonitor')) {
          setConnectedToDevice(true);
          if (step === 'connect') {
            setStep('credentials');
          }
        } else {
          setConnectedToDevice(false);
        }
      }
    });

    return () => unsubscribe();
  }, [step]);

  // Get phone's current WiFi SSID (home network)
  const checkCurrentWiFi = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      console.log('[WiFi] NetInfo:', JSON.stringify(netInfo));
      
      if (netInfo.type === 'wifi') {
        const ssid = netInfo.details?.ssid || netInfo.details?.['SSID'];
        if (ssid && ssid !== DEVICE_AP_SSID && !ssid.includes('SmartMonitor')) {
          setHomeWifiSSID(ssid);
          setWifiSSID(ssid);
          console.log('[WiFi] Home network detected:', ssid);
        }
      }
    } catch (error) {
      console.error('[WiFi] Detection error:', error);
    }
  };

  const sendCredentials = async () => {
    if (!wifiPassword.trim()) {
      Alert.alert('Error', 'Please enter WiFi password');
      return;
    }

    const ssid = wifiSSID || homeWifiSSID;
    if (!ssid) {
      Alert.alert('Error', 'Please enter WiFi network name');
      return;
    }

    try {
      setIsProcessing(true);
      setStep('provisioning');
      setStatusMessage('Sending WiFi credentials to device...');

      console.log('[Provisioning] Sending credentials:', { ssid });

      // Send credentials to device via HTTP POST
      const response = await fetch(DEVICE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssid: ssid,
          password: wifiPassword,
        }),
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[Provisioning] Response:', result);

      if (result.success) {
        setStatusMessage('Configuration successful! Device is restarting...');
        setTimeout(() => {
          setStep('success');
          setIsProcessing(false);
        }, 2000);
      } else {
        throw new Error(result.message || 'Configuration failed');
      }
      
    } catch (error: any) {
      console.error('[Provisioning] Error:', error);
      setIsProcessing(false);
      
      if (error.name === 'TimeoutError') {
        Alert.alert(
          'Connection Timeout',
          'Could not reach device. Make sure you are connected to "SmartMonitor_Setup" WiFi.',
          [
            { text: 'Open WiFi Settings', onPress: () => Linking.openSettings() },
            { text: 'Try Again', onPress: () => setStep('connect') }
          ]
        );
      } else {
        Alert.alert(
          'Configuration Failed',
          error.message || 'Could not configure device. Please try again.',
          [
            { text: 'Retry', onPress: () => setStep('credentials') }
          ]
        );
      }
    }
  };

  const renderIntro = () => (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Add {deviceType}</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        This setup requires connecting to the device's WiFi network temporarily.
      </Text>
      <View style={[styles.stepsList, { backgroundColor: colors.card }]}>
        <Text style={[styles.stepText, { color: colors.foreground }]}>1. Make sure device shows "SETUP MODE"</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>2. Connect to "{DEVICE_AP_SSID}" WiFi</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>3. Enter your home WiFi password</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>4. Done! Device will configure automatically</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => setStep('connect')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnect = () => (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Connect to Device</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        Connect your phone to the device's WiFi network to continue setup.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>WiFi Network:</Text>
        <Text style={[styles.infoValue, { color: colors.primary }]}>{DEVICE_AP_SSID}</Text>
        <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>
          (No password required)
        </Text>
      </View>

      {connectedToDevice ? (
        <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.successText, { color: colors.primary }]}>✓ Connected to device</Text>
        </View>
      ) : (
        <View style={[styles.warningBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
            Waiting for connection...
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open WiFi Settings</Text>
      </TouchableOpacity>

      {connectedToDevice && (
        <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => setStep('credentials')}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={() => setStep('intro')}>
        <Text style={[styles.linkText, { color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentials = () => (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>WiFi Configuration</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        Enter your home WiFi credentials to configure the device.
      </Text>

      {homeWifiSSID ? (
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Home WiFi Network:</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{homeWifiSSID}</Text>
        </View>
      ) : (
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
          placeholder="WiFi Network Name (SSID)"
          placeholderTextColor={colors.mutedForeground}
          value={wifiSSID}
          onChangeText={setWifiSSID}
          autoCapitalize="none"
        />
      )}

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
        placeholder="WiFi Password"
        placeholderTextColor={colors.mutedForeground}
        value={wifiPassword}
        onChangeText={setWifiPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, !wifiPassword && styles.buttonDisabled]}
        onPress={sendCredentials}
        disabled={!wifiPassword}
      >
        <Text style={styles.buttonText}>Configure Device</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => setStep('connect')}>
        <Text style={[styles.linkText, { color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProvisioning = () => (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.title, { color: colors.foreground }]}>Configuring Device...</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>{statusMessage}</Text>
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        This may take 10-30 seconds.{'\n'}
        Keep your phone on WiFi.
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.container}>
      <Text style={styles.successIcon}>✓</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Setup Complete!</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        Your {deviceType} has been configured successfully.{'\n\n'}
        Device will restart and connect to your WiFi network.{'\n\n'}
        It will appear in your devices list within 1-2 minutes.
      </Text>
      
      <View style={[styles.infoBox, { backgroundColor: colors.card, marginTop: 20 }]}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Next Steps:</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>1. Reconnect phone to home WiFi: {homeWifiSSID || wifiSSID}</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>2. Wait 1-2 minutes for device to connect</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>3. Check Devices screen</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open WiFi Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      {step === 'intro' && renderIntro()}
      {step === 'connect' && renderConnect()}
      {step === 'credentials' && renderCredentials()}
      {step === 'provisioning' && renderProvisioning()}
      {step === 'success' && renderSuccess()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  stepsList: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  stepText: {
    fontSize: 15,
    marginBottom: 12,
  },
  infoBox: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoNote: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  successBox: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningBox: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    padding: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  successIcon: {
    fontSize: 72,
    marginBottom: 20,
    color: '#00CC66',
  },
});
