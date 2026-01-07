import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Snowflake,
  Droplets,
  Blinds,
  ArrowLeft,
  CheckCircle,
  Radio,
  Wifi,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize, fontWeight, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi, HubApi } from '../services/api';
import { useToast } from '../components/Toast';

type DeviceType = 'ac' | 'dehumidifier' | 'shutters';

type Props = {
  route: RouteProp<RootStackParamList, 'IRRFDeviceOnboarding'>;
};

const DEVICE_INFO: Record<DeviceType, { name: string; icon: any; description: string; signalType: 'IR' | 'RF' }> = {
  ac: {
    name: 'Air Conditioner',
    icon: Snowflake,
    description: 'Control your AC unit via IR signals',
    signalType: 'IR',
  },
  dehumidifier: {
    name: 'Dehumidifier',
    icon: Droplets,
    description: 'Control your dehumidifier via RF signals',
    signalType: 'RF',
  },
  shutters: {
    name: 'Shutters',
    icon: Blinds,
    description: 'Control your shutters via RF signals',
    signalType: 'RF',
  },
};

export default function IRRFDeviceOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const homeId = user?.homeId;
  
  const deviceType = (route.params?.deviceType || 'ac') as DeviceType;
  const airguardDeviceId = route.params?.airguardDeviceId; // The AirGuard device/hub ID
  
  const [deviceName, setDeviceName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const deviceInfo = DEVICE_INFO[deviceType];
  const IconComponent = deviceInfo.icon;

  React.useEffect(() => {
    loadRooms();
  }, [homeId]);

  const loadRooms = async () => {
    if (!homeId || !token) {
      setLoadingRooms(false);
      return;
    }

    try {
      const client = getApiClient(async () => token);
      const homeApi = HomeApi(client);
      const response = await homeApi.getRooms(homeId);
      const roomsData = response.data?.data || response.data || [];
      setRooms(roomsData);
    } catch (error) {
      console.error('[IRRFOnboarding] Failed to load rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCreate = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    if (!selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }

    if (!airguardDeviceId) {
      Alert.alert('Error', 'AirGuard device ID is missing');
      return;
    }

    if (!homeId) {
      Alert.alert('Error', 'Home ID is missing');
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient(async () => token);
      const hubApi = HubApi(client);

      // Create device (not hub) - these are devices controlled by AirGuard
      const deviceData = {
        name: deviceName.trim(),
        type: deviceType === 'ac' ? 'ac' : deviceType === 'dehumidifier' ? 'fan' : 'shutter',
        category: deviceInfo.signalType,
        isActive: false,
        roomId: selectedRoom,
        hubId: airguardDeviceId, // Link to AirGuard hub
        metadata: {
          airguardDeviceId,
          signalType: deviceInfo.signalType,
          deviceType,
        },
      };

      await hubApi.createDevice(homeId, deviceData);
      
      showToast('Device created successfully!', 'success');
      navigation.goBack();
    } catch (error: any) {
      console.error('[IRRFOnboarding] Failed to create device:', error);
      Alert.alert('Error', error.message || 'Failed to create device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={`Add ${deviceInfo.name}`} showBack />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Device Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={gradients.accent}
            style={styles.iconGradient}
          >
            <IconComponent size={48} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.description}>{deviceInfo.description}</Text>

        {/* Device Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${deviceInfo.name.toLowerCase()} name`}
            placeholderTextColor={colors.mutedForeground}
            value={deviceName}
            onChangeText={setDeviceName}
            autoCapitalize="words"
          />
        </View>

        {/* Room Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Room</Text>
          {loadingRooms ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomScroll}>
              {rooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.roomChip,
                    selectedRoom === room.id && styles.roomChipSelected,
                  ]}
                  onPress={() => setSelectedRoom(room.id)}
                >
                  {selectedRoom === room.id && (
                    <CheckCircle size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  )}
                  <Text
                    style={[
                      styles.roomChipText,
                      selectedRoom === room.id && styles.roomChipTextSelected,
                    ]}
                  >
                    {room.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Signal Type Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Radio size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Signal Type: <Text style={styles.infoBold}>{deviceInfo.signalType}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Wifi size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Controlled by: <Text style={styles.infoBold}>AirGuard</Text>
            </Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? [colors.muted, colors.muted] : gradients.accent}
            style={styles.createButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Device</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    iconContainer: {
      alignItems: 'center',
      marginVertical: spacing.xl,
    },
    iconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    description: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    section: {
      gap: spacing.sm,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingContainer: {
      padding: spacing.md,
      alignItems: 'center',
    },
    roomScroll: {
      flexDirection: 'row',
    },
    roomChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    roomChipSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    roomChipText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    roomChipTextSelected: {
      color: colors.primary,
      fontWeight: fontWeight.semibold,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    infoText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    infoBold: {
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
    },
    createButton: {
      marginTop: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    createButtonDisabled: {
      opacity: 0.6,
    },
    createButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    createButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: '#fff',
    },
  });

