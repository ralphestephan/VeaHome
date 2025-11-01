import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Wifi, Home, ArrowRight, Loader } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, HubApi, HomeApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'HubPair'>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    hubId: string;
    qrCode: string;
  };
};

type Step = 'confirm' | 'wifi' | 'rooms' | 'ready';

export default function HubSetupWizard() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { token, user } = useAuth();
  const { hubId, qrCode } = route.params || { hubId: '', qrCode: '' };
  
  const [step, setStep] = useState<Step>('confirm');
  const [loading, setLoading] = useState(false);
  const [hubStatus, setHubStatus] = useState<any>(null);
  
  // WiFi step
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Rooms step
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);
  const homeApi = HomeApi(client);

  React.useEffect(() => {
    if (hubId) {
      checkHubStatus();
    }
    loadRooms();
  }, [hubId]);

  const checkHubStatus = async () => {
    try {
      const response = await hubApi.getHubStatus(hubId);
      setHubStatus(response.data);
    } catch (e) {
      console.error('Error checking hub status:', e);
    }
  };

  const loadRooms = async () => {
    if (!user?.homeId) return;
    try {
      const response = await homeApi.getRooms(user.homeId);
      setAvailableRooms(response.data || []);
    } catch (e) {
      console.error('Error loading rooms:', e);
    }
  };

  const handleConnectWifi = async () => {
    if (!wifiSSID.trim()) {
      Alert.alert('Error', 'Please enter WiFi SSID');
      return;
    }
    
    setLoading(true);
    try {
      await hubApi.connectWifi(hubId, wifiSSID, wifiPassword);
      setStep('rooms');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to connect hub to WiFi');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRooms = async () => {
    if (selectedRooms.length === 0) {
      Alert.alert('Error', 'Please select at least one room');
      return;
    }
    if (selectedRooms.length > 2) {
      Alert.alert('Error', 'Maximum 2 rooms allowed per hub');
      return;
    }
    
    setLoading(true);
    try {
      await hubApi.assignRooms(hubId, selectedRooms);
      setStep('ready');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to assign rooms');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoom = (roomId: string) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    } else {
      if (selectedRooms.length < 2) {
        setSelectedRooms([...selectedRooms, roomId]);
      } else {
        Alert.alert('Limit Reached', 'Maximum 2 rooms per hub');
      }
    }
  };

  // Hub Confirmation Screen
  const renderConfirmStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color={colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Hub Found!</Text>
      <Text style={styles.stepDescription}>
        Hub ID: {hubId}
      </Text>
      <Text style={styles.stepDescription}>
        {hubStatus?.status === 'ready' ? 'Hub is ready' : 'Setting up hub...'}
      </Text>
      
      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
      )}
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('wifi')}
      >
        <Text style={styles.primaryButtonText}>Continue to Setup</Text>
        <ArrowRight size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  // WiFi Credentials Screen
  const renderWifiStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Wifi size={64} color={colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Connect Hub to WiFi</Text>
      <Text style={styles.stepDescription}>
        Enter your home WiFi credentials to connect the hub
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi SSID</Text>
        <TextInput
          style={styles.input}
          value={wifiSSID}
          onChangeText={setWifiSSID}
          placeholder="Enter WiFi network name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi Password</Text>
        <TextInput
          style={styles.input}
          value={wifiPassword}
          onChangeText={setWifiPassword}
          placeholder="Enter WiFi password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.togglePassword}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.togglePasswordText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleConnectWifi}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Connect to WiFi</Text>
            <ArrowRight size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Room Assignment Screen
  const renderRoomsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Home size={64} color={colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Assign Rooms</Text>
      <Text style={styles.stepDescription}>
        Select up to 2 rooms where this hub will be located
      </Text>
      
      <ScrollView style={styles.roomsList}>
        {availableRooms.map(room => {
          const isSelected = selectedRooms.includes(room.id);
          return (
            <TouchableOpacity
              key={room.id}
              style={[styles.roomCard, isSelected && styles.roomCardSelected]}
              onPress={() => toggleRoom(room.id)}
            >
              <View style={styles.roomCardContent}>
                <Text style={[styles.roomName, isSelected && styles.roomNameSelected]}>
                  {room.name}
                </Text>
                {isSelected && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        
        {availableRooms.length === 0 && (
          <Text style={styles.emptyText}>No rooms available. Please create rooms first.</Text>
        )}
      </ScrollView>
      
      <View style={styles.selectedInfo}>
        <Text style={styles.selectedText}>
          Selected: {selectedRooms.length} / 2
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleAssignRooms}
        disabled={loading || selectedRooms.length === 0}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Hub Ready Screen
  const renderReadyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color={colors.success || '#10b981'} />
      </View>
      <Text style={styles.stepTitle}>Hub Ready!</Text>
      <Text style={styles.stepDescription}>
        Your hub has been successfully set up and is ready to use.
      </Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Hub ID</Text>
        <Text style={styles.infoValue}>{hubId}</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Assigned Rooms</Text>
        <Text style={styles.infoValue}>
          {selectedRooms.map(id => availableRooms.find(r => r.id === id)?.name).join(', ')}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('DeviceOnboarding', { hubId })}
      >
        <Text style={styles.primaryButtonText}>Add Devices</Text>
        <ArrowRight size={20} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'DashboardTab' })}
      >
        <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Hub Setup" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'confirm' && renderConfirmStep()}
        {step === 'wifi' && renderWifiStep()}
        {step === 'rooms' && renderRoomsStep()}
        {step === 'ready' && renderReadyStep()}
      </ScrollView>
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, step === 'confirm' && styles.progressDotActive]} />
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, step === 'wifi' && styles.progressDotActive]} />
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, step === 'rooms' && styles.progressDotActive]} />
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, step === 'ready' && styles.progressDotActive]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  togglePassword: {
    position: 'absolute',
    right: spacing.md,
    top: 40,
  },
  togglePasswordText: {
    color: colors.primary,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  roomsList: {
    width: '100%',
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  roomCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  roomCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    color: colors.foreground,
  },
  roomNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 14,
    padding: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.muted,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.muted,
    marginHorizontal: spacing.xs,
  },
});

