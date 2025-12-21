import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import SmartConfig from 'react-native-smartconfig';
import NetInfo from '@react-native-community/netinfo';

export default function DeviceProvisioningESPTouch({ route }: any) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const deviceType = route.params?.deviceType || 'AirGuard';
  
  const [step, setStep] = useState<'intro' | 'credentials' | 'provisioning' | 'success'>('intro');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentSSID, setCurrentSSID] = useState('');

  // Get phone's current WiFi SSID
  const checkCurrentWiFi = async () => {
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && netInfo.details?.ssid) {
      setCurrentSSID(netInfo.details.ssid);
      return netInfo.details.ssid;
    }
    Alert.alert('Not Connected', 'Please connect your phone to WiFi first');
    return null;
  };

  const startProvisioning = async () => {
    const ssid = await checkCurrentWiFi();
    if (!ssid) return;

    try {
      setIsProcessing(true);
      setStep('provisioning');
      setStatusMessage('Broadcasting WiFi credentials...');

      // Start ESPTouch SmartConfig
      const result = await SmartConfig.start({
        type: 'esptouch',
        ssid: ssid,
        bssid: ssid, // Use SSID as fallback
        password: wifiPassword,
        timeout: 60000, // 60 seconds
      });

      if (result.success) {
        setStatusMessage('✓ Device configured successfully!');
        setStep('success');
      } else {
        throw new Error('Configuration timeout - device did not respond');
      }
    } catch (error: any) {
      setIsProcessing(false);
      Alert.alert('Configuration Failed', error.message || 'Please try again');
      setStep('credentials');
    } finally {
      SmartConfig.stop();
    }
  };

  const renderIntro = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Add {deviceType}</Text>
      <Text style={styles.description}>
        Fully automatic WiFi configuration - no manual steps required!
      </Text>
      <View style={styles.stepsList}>
        <Text style={styles.stepText}>1. Make sure device shows "SETUP MODE"</Text>
        <Text style={styles.stepText}>2. Enter your WiFi password</Text>
        <Text style={styles.stepText}>3. Click Configure - that's it!</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => setStep('credentials')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentials = () => (
    <View style={styles.container}>
      <Text style={styles.title}>WiFi Configuration</Text>
      <Text style={styles.description}>
        Your phone will broadcast credentials to the device.{'\n'}
        Keep your phone on WiFi during this process.
      </Text>

      {currentSSID && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Current WiFi:</Text>
          <Text style={styles.infoValue}>{currentSSID}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
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
      <Text style={styles.title}>Configuring Device...</Text>
      <Text style={styles.description}>{statusMessage}</Text>
      <Text style={styles.note}>
        This may take 10-30 seconds.{'\n'}
        Keep your phone on WiFi.
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.container}>
      <Text style={styles.successIcon}>✓</Text>
      <Text style={styles.title}>Setup Complete!</Text>
      <Text style={styles.description}>
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
    backgroundColor: 'rgba(0,0,0,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.1)',
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
  },
});
