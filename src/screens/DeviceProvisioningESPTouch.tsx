import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import NetInfo from '@react-native-community/netinfo';
import WifiManager from 'react-native-wifi-reborn';

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
  const [hasPermissions, setHasPermissions] = useState(false);

  // Request WiFi permissions and detect home WiFi on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Request necessary permissions for WiFi management
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
          PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
        ]);
        
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        setHasPermissions(allGranted);
        if (allGranted) {
          checkCurrentWiFi();
        } else {
          Alert.alert(
            'Permissions Required',
            'Location and WiFi permissions are needed to configure the device automatically.',
            [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
          );
        }
      } catch (err) {
        console.error('[Permissions] Error:', err);
      }
    } else {
      // iOS doesn't need runtime permissions for WiFi
      setHasPermissions(true);
      checkCurrentWiFi();
    }
  };

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
      // Try WifiManager first (more reliable)
      try {
        const ssid = await WifiManager.getCurrentWifiSSID();
        if (ssid && ssid !== DEVICE_AP_SSID && !ssid.includes('SmartMonitor')) {
          // Remove quotes if present (Android sometimes returns SSID with quotes)
          const cleanSSID = ssid.replace(/"/g, '');
          setHomeWifiSSID(cleanSSID);
          setWifiSSID(cleanSSID);
          console.log('[WiFi] Home network detected:', cleanSSID);
          return;
        }
      } catch (wifiErr) {
        console.log('[WiFi] WifiManager failed, trying NetInfo');
      }

      // Fallback to NetInfo
      const netInfo = await NetInfo.fetch();
      if (netInfo.type === 'wifi') {
        const ssid = netInfo.details?.ssid || netInfo.details?.['SSID'];
        if (ssid && ssid !== DEVICE_AP_SSID && !ssid.includes('SmartMonitor')) {
          setHomeWifiSSID(ssid);
          setWifiSSID(ssid);
          console.log('[WiFi] Home network detected (NetInfo):', ssid);
        }
      }
    } catch (error) {
      console.error('[WiFi] Detection error:', error);
    }
  };

  // Automatically connect to device AP
  const connectToDeviceAP = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Connecting to device WiFi...');
      console.log('[WiFi] Attempting to connect to:', DEVICE_AP_SSID);

      if (Platform.OS === 'ios') {
        // iOS 11+: Use NEHotspotConfiguration
        await WifiManager.connectToProtectedSSID(DEVICE_AP_SSID, '', false, false);
      } else {
        // Android: Use WifiManager
        await WifiManager.connectToProtectedSSID(DEVICE_AP_SSID, '', false);
      }

      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify connection
      const currentSSID = await WifiManager.getCurrentWifiSSID();
      const cleanSSID = currentSSID.replace(/"/g, '');
      
      if (cleanSSID === DEVICE_AP_SSID || cleanSSID.includes('SmartMonitor')) {
        console.log('[WiFi] Successfully connected to device');
        setConnectedToDevice(true);
        setIsProcessing(false);
        setStep('credentials');
      } else {
        throw new Error('Failed to connect to device WiFi');
      }
    } catch (error: any) {
      console.error('[WiFi] Connection error:', error);
      setIsProcessing(false);
      
      Alert.alert(
        'Connection Failed',
        `Could not connect to device WiFi automatically.\n\nPlease connect manually to "${DEVICE_AP_SSID}" in WiFi settings.`,
        [
          { text: 'Open WiFi Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', onPress: () => setStep('intro') }
        ]
      );
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
        setStatusMessage('Configuration successful! Reconnecting to home WiFi...');
        
        // Automatically reconnect to home WiFi
        setTimeout(async () => {
          try {
            if (homeWifiSSID && wifiPassword) {
              console.log('[WiFi] Reconnecting to home network:', homeWifiSSID);
              
              if (Platform.OS === 'ios') {
                await WifiManager.connectToProtectedSSID(homeWifiSSID, wifiPassword, false, false);
              } else {
                await WifiManager.connectToProtectedSSID(homeWifiSSID, wifiPassword, false);
              }
              
              setStatusMessage('Reconnected to home WiFi!');
            }
          } catch (reconnectErr) {
            console.log('[WiFi] Auto-reconnect failed, user will reconnect manually');
          }
          
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
        Setup requires connecting to the device's WiFi network temporarily.
      </Text>
      <View style={[styles.stepsList, { backgroundColor: colors.card }]}>
        <Text style={[styles.stepText, { color: colors.foreground }]}>1. Device shows "SETUP MODE"</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>2. Connect to "{DEVICE_AP_SSID}" WiFi</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>3. Return to app</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>4. Enter your home WiFi password</Text>
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
        Please connect your phone to the device's WiFi network:
      </Text>
      
      <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>WiFi Network:</Text>
        <Text style={[styles.infoValue, { color: colors.primary, fontSize: 20, fontWeight: 'bold' }]}>{DEVICE_AP_SSID}</Text>
        <Text style={[styles.infoNote, { color: colors.mutedForeground, marginTop: 4 }]}>
          (Open network - no password needed)
        </Text>
      </View>

      <View style={[styles.stepsBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>Steps:</Text>
        <Text style={[styles.stepInstruction, { color: colors.foreground }]}>1. Tap "Open WiFi Settings" below</Text>
        <Text style={[styles.stepInstruction, { color: colors.foreground }]}>2. Find and connect to: {DEVICE_AP_SSID}</Text>
        <Text style={[styles.stepInstruction, { color: colors.foreground }]}>3. Return to this app</Text>
        <Text style={[styles.stepInstruction, { color: colors.foreground }]}>4. Tap "I'm Connected"</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open WiFi Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 12, backgroundColor: '#28a745' }]} onPress={() => setStep('credentials')}>
        <Text style={styles.buttonText}>I'm Connected - Continue</Text>
      </TouchableOpacity>

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
        Your {deviceType} has been configured successfully!{'\n\n'}
        Device is restarting and will connect to your WiFi.{'\n\n'}
        {homeWifiSSID && 'Your phone has been automatically reconnected to your home WiFi.'}
        {'\n\n'}Device will appear in your devices list within 1-2 minutes.
      </Text>
      
      <View style={[styles.infoBox, { backgroundColor: colors.card, marginTop: 20 }]}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>What's happening:</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>✓ Device received WiFi credentials</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>✓ Device is restarting</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>✓ {homeWifiSSID ? 'Phone reconnected to home WiFi' : 'Reconnect phone to home WiFi'}</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>⏳ Device connecting (1-2 minutes)</Text>
      </View>

      {!homeWifiSSID && (
        <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
          <Text style={styles.buttonText}>Reconnect to Home WiFi</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Go to Devices</Text>
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
  stepsBox: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepInstruction: {
    fontSize: 15,
    marginBottom: 8,
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
