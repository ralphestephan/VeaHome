import React, { useState, useEffect } from 'react';
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
import { 
  Lightbulb, 
  Thermometer, 
  Tv, 
  Fan, 
  Lock, 
  Camera, 
  Radio,
  ArrowRight,
  CheckCircle,
  Loader,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, HubApi, HomeApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    hubId: string;
  };
};

type DeviceType = 'light' | 'ac' | 'tv' | 'blind' | 'lock' | 'camera' | 'sensor';
type DeviceCategory = 'IR' | 'RF' | 'Relay' | 'Sensor' | 'Zigbee' | 'Matter' | 'WiFi';

const DEVICE_TYPES: { type: DeviceType; icon: any; name: string }[] = [
  { type: 'light', icon: Lightbulb, name: 'Light' },
  { type: 'ac', icon: Thermometer, name: 'AC' },
  { type: 'tv', icon: Tv, name: 'TV' },
  { type: 'blind', icon: Fan, name: 'Blinds' },
  { type: 'lock', icon: Lock, name: 'Lock' },
  { type: 'camera', icon: Camera, name: 'Camera' },
  { type: 'sensor', icon: Radio, name: 'Sensor' },
];

const DEVICE_ACTIONS: Record<string, string[]> = {
  ac: ['ON', 'OFF', 'TEMP_UP', 'TEMP_DOWN', 'MODE', 'FAN_SPEED'],
  tv: ['ON', 'OFF', 'CHANNEL_UP', 'CHANNEL_DOWN', 'VOLUME_UP', 'VOLUME_DOWN'],
  blind: ['UP', 'DOWN', 'STOP'],
};

type Step = 'type' | 'config' | 'learning' | 'wifi' | 'ready';

export default function DeviceOnboardingWizard() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { token, user } = useAuth();
  const { hubId } = route.params || { hubId: '' };
  
  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(false);
  
  // Device configuration
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>('IR');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  
  // Signal learning
  const [deviceId, setDeviceId] = useState<string>('');
  const [learnedActions, setLearnedActions] = useState<Set<string>>(new Set());
  const [learningAction, setLearningAction] = useState<string | null>(null);
  
  // WiFi config
  const [deviceWifiSSID, setDeviceWifiSSID] = useState('');
  const [deviceWifiPassword, setDeviceWifiPassword] = useState('');
  
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);
  const homeApi = HomeApi(client);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    if (!user?.homeId) return;
    try {
      const response = await homeApi.getRooms(user.homeId);
      setAvailableRooms(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedRoom(response.data[0].id);
      }
    } catch (e) {
      console.error('Error loading rooms:', e);
    }
  };

  const handleSelectType = (type: DeviceType) => {
    setDeviceType(type);
    setStep('config');
  };

  const handleCreateDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter device name');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }
    if (!user?.homeId) return;
    
    setLoading(true);
    try {
      const response = await hubApi.addDevice(user.homeId, {
        name: deviceName,
        type: deviceType,
        category: deviceCategory,
        roomId: selectedRoom,
        hubId,
      });
      
      const newDeviceId = response.data?.id || response.data?.deviceId;
      setDeviceId(newDeviceId);
      
      // If IR/RF device, go to learning step
      if (deviceCategory === 'IR' || deviceCategory === 'RF') {
        setStep('learning');
      } else if (deviceCategory === 'WiFi') {
        setStep('wifi');
      } else {
        setStep('ready');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to create device');
    } finally {
      setLoading(false);
    }
  };

  const handleLearnSignal = async (action: string) => {
    if (!deviceId) return;
    
    setLearningAction(action);
    try {
      await hubApi.learnSignal(hubId, deviceId, action);
      setLearnedActions(new Set([...learnedActions, action]));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || `Failed to learn ${action}`);
    } finally {
      setLearningAction(null);
    }
  };

  const handleConnectDeviceWifi = async () => {
    if (!deviceWifiSSID.trim()) {
      Alert.alert('Error', 'Please enter device WiFi SSID');
      return;
    }
    
    setLoading(true);
    try {
      // Wait for device to connect
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('ready');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to connect device');
    } finally {
      setLoading(false);
    }
  };

  // Device Type Selection
  const renderTypeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Device Type</Text>
      <Text style={styles.stepDescription}>
        Choose the type of device you want to add
      </Text>
      
      <View style={styles.deviceTypesGrid}>
        {DEVICE_TYPES.map(({ type, icon: Icon, name }) => (
          <TouchableOpacity
            key={type}
            style={styles.deviceTypeCard}
            onPress={() => handleSelectType(type)}
          >
            <View style={styles.deviceTypeIcon}>
              <Icon size={32} color={colors.primary} />
            </View>
            <Text style={styles.deviceTypeName}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Device Configuration
  const renderConfigStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Device</Text>
      <Text style={styles.stepDescription}>
        Enter device details and select room
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Device Name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder={`e.g., ${deviceType === 'ac' ? 'Living Room AC' : deviceType === 'tv' ? 'Living Room TV' : 'Device Name'}`}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {['IR', 'RF', 'Relay', 'Sensor', 'Zigbee', 'Matter', 'WiFi'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                deviceCategory === cat && styles.categoryButtonSelected,
              ]}
              onPress={() => setDeviceCategory(cat as DeviceCategory)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  deviceCategory === cat && styles.categoryButtonTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Room</Text>
        <ScrollView style={styles.roomsList}>
          {availableRooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomCard,
                selectedRoom === room.id && styles.roomCardSelected,
              ]}
              onPress={() => setSelectedRoom(room.id)}
            >
              <Text
                style={[
                  styles.roomName,
                  selectedRoom === room.id && styles.roomNameSelected,
                ]}
              >
                {room.name}
              </Text>
              {selectedRoom === room.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleCreateDevice}
        disabled={loading}
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

  // Signal Learning
  const renderLearningStep = () => {
    const actions = DEVICE_ACTIONS[deviceType || ''] || [];
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Learn Device Signals</Text>
        <Text style={styles.stepDescription}>
          Point your remote at the hub and press each button on your remote
        </Text>
        
        <View style={styles.actionsGrid}>
          {actions.map((action) => {
            const isLearned = learnedActions.has(action);
            const isLearning = learningAction === action;
            
            return (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionButton,
                  isLearned && styles.actionButtonLearned,
                  isLearning && styles.actionButtonLearning,
                ]}
                onPress={() => handleLearnSignal(action)}
                disabled={isLearning || isLearned}
              >
                {isLearning ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isLearned ? (
                  <CheckCircle size={24} color={colors.success || '#10b981'} />
                ) : null}
                <Text
                  style={[
                    styles.actionButtonText,
                    isLearned && styles.actionButtonTextLearned,
                  ]}
                >
                  {action.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text style={styles.learningHint}>
          {learningAction
            ? `Press ${learningAction.replace('_', ' ')} on your remote now...`
            : 'Tap each button to learn the signal'}
        </Text>
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            learnedActions.size < actions.length && styles.buttonDisabled,
          ]}
          onPress={() => setStep('ready')}
          disabled={learnedActions.size < actions.length}
        >
          <Text style={styles.primaryButtonText}>
            {learnedActions.size === actions.length ? 'Continue' : `Learn ${actions.length - learnedActions.size} more`}
          </Text>
          <ArrowRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  // WiFi Device Configuration
  const renderWifiStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Connect Device to WiFi</Text>
      <Text style={styles.stepDescription}>
        Enter WiFi credentials for your device
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi SSID</Text>
        <TextInput
          style={styles.input}
          value={deviceWifiSSID}
          onChangeText={setDeviceWifiSSID}
          placeholder="Enter WiFi network name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi Password</Text>
        <TextInput
          style={styles.input}
          value={deviceWifiPassword}
          onChangeText={setDeviceWifiPassword}
          placeholder="Enter WiFi password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleConnectDeviceWifi}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Connect Device</Text>
            <ArrowRight size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Device Ready
  const renderReadyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color={colors.success || '#10b981'} />
      </View>
      <Text style={styles.stepTitle}>Device Ready!</Text>
      <Text style={styles.stepDescription}>
        Your device has been successfully added and configured.
      </Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Device Name</Text>
        <Text style={styles.infoValue}>{deviceName}</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Type</Text>
        <Text style={styles.infoValue}>{deviceType?.toUpperCase()}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.primaryButtonText}>View Devices</Text>
        <ArrowRight size={20} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setStep('type');
          setDeviceType(null);
          setDeviceName('');
          setSelectedRoom('');
          setLearnedActions(new Set());
          setDeviceId('');
        }}
      >
        <Text style={styles.secondaryButtonText}>Add Another Device</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Add Device" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'type' && renderTypeStep()}
        {step === 'config' && renderConfigStep()}
        {step === 'learning' && renderLearningStep()}
        {step === 'wifi' && renderWifiStep()}
        {step === 'ready' && renderReadyStep()}
      </ScrollView>
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
  deviceTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  deviceTypeCard: {
    width: '30%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceTypeName: {
    fontSize: 12,
    color: colors.foreground,
    textAlign: 'center',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.foreground,
  },
  categoryButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  roomsList: {
    maxHeight: 200,
  },
  roomCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  roomName: {
    fontSize: 16,
    color: colors.foreground,
  },
  roomNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: 100,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonLearned: {
    backgroundColor: `${colors.success}20`,
    borderColor: colors.success || '#10b981',
  },
  actionButtonLearning: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.foreground,
    textAlign: 'center',
  },
  actionButtonTextLearned: {
    color: colors.success || '#10b981',
    fontWeight: '600',
  },
  learningHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
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
});

