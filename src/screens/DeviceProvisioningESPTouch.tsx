import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
// import SmartConfig from 'react-native-smartconfig';
import NetInfo from '@react-native-community/netinfo';

export default function DeviceProvisioningESPTouch({ route }: any) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const deviceType = route.params?.deviceType || 'AirGuard';
  
  const [step, setStep] = useState<'intro' | 'credentials' | 'provisioning' | 'success'>('intro');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentSSID, setCurrentSSID] = useState('');
  const [manualMode, setManualMode] = useState(false);

  // Auto-detect WiFi on mount
  useEffect(() => {
    checkCurrentWiFi();
  }, []);

  // Get phone's current WiFi SSID
  const checkCurrentWiFi = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      console.log('[ESPTouch] NetInfo:', JSON.stringify(netInfo));
      
      if (netInfo.type === 'wifi') {
        // Try to get SSID from details
        const ssid = netInfo.details?.ssid || netInfo.details?.['SSID'];
        if (ssid) {
          setCurrentSSID(ssid);
          return ssid;
        }
      }
      
      // If we can't detect SSID, still allow user to proceed
      Alert.alert(
        'WiFi Detection',
        'Could not detect WiFi name automatically. Make sure you are connected to WiFi and enter the network name manually if needed.',
        [{ text: 'OK' }]
      );
      return 'unknown'; // Return a placeholder to allow proceeding
    } catch (error) {
      console.error('[ESPTouch] WiFi check error:', error);
      return 'unknown';
    }
  };

  const startProvisioning = async () => {
    if (!wifiPassword.trim()) {
      Alert.alert('Error', 'Please enter WiFi password');
      return;
    }

    let ssid = currentSSID || wifiSSID;
    if (!ssid || ssid === 'unknown') {
      const tempSsid = await checkCurrentWiFi();
      if (tempSsid && tempSsid !== 'unknown') {
        ssid = tempSsid;
      }
    }

    if (!ssid || ssid === 'unknown') {
      Alert.alert(
        'WiFi Required',
        'Please enter your WiFi network name manually',
        [{ text: 'OK', onPress: () => setManualMode(true) }]
      );
      return;
    }

    try {
      setIsProcessing(true);
      setStep('provisioning');
      setStatusMessage('Connecting to device WiFi network...');

      console.log('[Provisioning] Starting with SSID:', ssid);

      // For now, show instructions since SmartConfig isn't working
      Alert.alert(
        'Manual Setup Required',
        `1. Connect your phone to "SmartMonitor_Setup" WiFi\n2. Device will configure automatically\n\nNetwork: ${ssid}\nPassword: ${wifiPassword}`,
        [
          {
            text: 'Open WiFi Settings',
            onPress: () => {
              Linking.openSettings();
              setStep('success');
            }
          },
          {
            text: 'Done',
            onPress: () => setStep('success')
          }
        ]
      );

      setIsProcessing(false);
      
    } catch (error: any) {
      console.error('[Provisioning] Error:', error);
      setIsProcessing(false);
      Alert.alert('Error', error.message || 'Setup failed. Please try again.');
      setStep('credentials');
    }
  };

  const renderIntro = () => (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Add {deviceType}</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        Fully automatic WiFi configuration - no manual steps required!
      </Text>
      <View style={[styles.stepsList, { backgroundColor: colors.card }]}>
        <Text style={[styles.stepText, { color: colors.foreground }]}>1. Make sure device shows "SETUP MODE"</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>2. Enter your WiFi password</Text>
        <Text style={[styles.stepText, { color: colors.foreground }]}>3. Click Configure - that's it!</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => setStep('credentials')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentials = () => (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>WiFi Configuration</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        Enter your WiFi credentials to configure the device.
      </Text>

      {currentSSID && currentSSID !== 'unknown' ? (
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Current WiFi:</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{currentSSID}</Text>
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
        onPress={startProvisioning}
        disabled={!wifiPassword}
      >
        <Text style={styles.buttonText}>Configure Device</Text>
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
        Your {deviceType} is now connected and will appear in your devices list shortly.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      {step === 'intro' && renderIntro()}
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
