import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, RefreshCw, Power, Link as LinkIcon } from 'lucide-react-native';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiClient, TuyaApi } from '../services/api';
import TuyaDeviceControl from '../components/TuyaDeviceControl';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'TuyaIntegration';
  params: { homeId?: string };
};

interface TuyaDevice {
  id: string;
  tuya_device_id: string;
  name: string;
  category: string | null;
  online: boolean;
  state: any;
  home_id: string | null;
}

export default function TuyaIntegrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = createStyles(colors, gradients, shadows);
  const { user, token } = useAuth();
  const homeId = route.params?.homeId || user?.homeId;

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);

  const apiClient = getApiClient(async () => token || null);
  const tuyaApi = TuyaApi(apiClient);

  const checkIntegration = useCallback(async () => {
    try {
      const response = await tuyaApi.getIntegration();
      const data = response.data?.data || response.data;
      setConnected(data?.connected || false);
      setIntegrationId(data?.integration?.id || null);

      if (data?.connected) {
        await loadDevices();
      }
    } catch (error: any) {
      console.error('Check integration error:', error);
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to check Tuya integration status');
      }
    } finally {
      setLoading(false);
    }
  }, [tuyaApi]);

  const loadDevices = useCallback(async () => {
    try {
      const response = await tuyaApi.listDevices(homeId);
      const data = response.data?.data || response.data;
      setDevices(data?.devices || []);
    } catch (error: any) {
      console.error('Load devices error:', error);
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load Tuya devices');
      }
    }
  }, [tuyaApi, homeId]);

  useEffect(() => {
    checkIntegration();
  }, [checkIntegration]);

  useEffect(() => {
    // Handle deep link callback for OAuth
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const code = url.searchParams.get('code');

        if (code) {
          setConnecting(true);
          // Extract redirect URI from URL
          const redirectUri = `${url.protocol}//${url.host}${url.pathname}`;
          
          // Exchange code for tokens
          await tuyaApi.handleCallback(code, redirectUri);
          Alert.alert('Success', 'Tuya account connected successfully!');
          await checkIntegration();
          setConnecting(false);
        }
      } catch (error: any) {
        console.error('Deep link error:', error);
        Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to complete connection');
        setConnecting(false);
      }
    };

    // Add listener for app opening from URL
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tuyaApi, checkIntegration]);

  const handleConnect = async () => {
    try {
      setConnecting(true);

      // Get redirect URI - use a custom URL scheme
      // You'll need to configure this in your app.json/app.config.js
      const redirectUri = 'veahome://tuya-callback';
      
      // Get auth URL from backend
      const response = await tuyaApi.getAuthUrl(redirectUri);
      const authUrl = response.data?.data?.authUrl || response.data?.authUrl;

      if (!authUrl) {
        throw new Error('Failed to get authorization URL');
      }

      // Open browser for OAuth
      const canOpen = await Linking.canOpenURL(authUrl);
      if (!canOpen) {
        throw new Error('Cannot open authorization URL');
      }

      await Linking.openURL(authUrl);
      
      // Show message that user should return to app
      Alert.alert(
        'Complete Authorization',
        'Please complete the authorization in your browser, then return to the app.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Connect error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to connect Tuya account');
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Tuya',
      'Are you sure you want to disconnect your Tuya account? All Tuya devices will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await tuyaApi.disconnect();
              setConnected(false);
              setDevices([]);
              setIntegrationId(null);
              Alert.alert('Success', 'Tuya account disconnected');
            } catch (error: any) {
              console.error('Disconnect error:', error);
              Alert.alert('Error', 'Failed to disconnect Tuya account');
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await tuyaApi.syncDevices();
      const data = response.data?.data || response.data;
      setDevices(data?.devices || []);
      Alert.alert('Success', 'Devices synced successfully');
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to sync devices');
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignToHome = async (deviceId: string) => {
    try {
      await tuyaApi.updateDevice(deviceId, { home_id: homeId || null });
      await loadDevices();
      Alert.alert('Success', 'Device assigned to home');
    } catch (error: any) {
      console.error('Assign device error:', error);
      Alert.alert('Error', 'Failed to assign device to home');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkIntegration();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Tuya Integration" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Tuya Integration" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, connected && styles.statusDotConnected]} />
              <Text style={styles.statusText}>
                {connected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            {connected && (
              <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
                <X size={16} color={colors.destructive} />
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>

          {!connected ? (
            <View style={styles.connectSection}>
              <Text style={styles.description}>
                Connect your Tuya account to discover and control your Tuya smart devices.
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnect}
                disabled={connecting}
              >
                <LinearGradient
                  colors={gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.connectButtonGradient}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <LinkIcon size={20} color="white" />
                      <Text style={styles.connectButtonText}>Connect Tuya Account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.connectedSection}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw size={16} color={colors.primary} style={syncing && styles.spinning} />
                  <Text style={styles.syncButtonText}>
                    {syncing ? 'Syncing...' : 'Sync Devices'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Devices List */}
        {connected && (
          <View style={styles.devicesSection}>
            <Text style={styles.sectionTitle}>
              Tuya Devices ({devices.length})
            </Text>
            {devices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No devices found</Text>
                <Text style={styles.emptySubtext}>
                  Click "Sync Devices" to discover your Tuya devices
                </Text>
              </View>
            ) : (
              devices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={styles.deviceCard}
                  onPress={() => setSelectedDevice(device)}
                >
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceHeader}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <View style={styles.deviceBadges}>
                        <View
                          style={[
                            styles.statusBadge,
                            device.online ? styles.statusBadgeOnline : styles.statusBadgeOffline,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusBadgeDot,
                              device.online && styles.statusBadgeDotOnline,
                            ]}
                          />
                          <Text style={styles.statusBadgeText}>
                            {device.online ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                        {device.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{device.category}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {!device.home_id && (
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleAssignToHome(device.id);
                        }}
                      >
                        <Power size={14} color={colors.primary} />
                        <Text style={styles.assignButtonText}>Assign to Home</Text>
                      </TouchableOpacity>
                    )}
                    {device.home_id && (
                      <View style={styles.assignedBadge}>
                        <Check size={14} color={colors.success} />
                        <Text style={styles.assignedText}>Assigned to this home</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Device Control Modal */}
        {selectedDevice && (
          <Modal
            visible={!!selectedDevice}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedDevice(null)}
          >
            <SafeAreaView style={styles.modalContainer} edges={['top']}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedDevice.name}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedDevice(null)}
                >
                  <X size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <TuyaDeviceControl
                device={selectedDevice}
                apiClient={apiClient}
                onStateUpdate={() => {
                  loadDevices();
                }}
              />
            </SafeAreaView>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusCard: {
      backgroundColor: colors.secondary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      ...shadows.small,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.mutedForeground,
      marginRight: 8,
    },
    statusDotConnected: {
      backgroundColor: colors.success,
    },
    statusText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    disconnectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.destructive,
    },
    disconnectText: {
      fontSize: 14,
      color: colors.destructive,
      marginLeft: 6,
      fontWeight: '500',
    },
    connectSection: {
      marginTop: 8,
    },
    description: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 20,
      lineHeight: 20,
    },
    connectButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    connectButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      gap: 8,
    },
    connectButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    connectedSection: {
      marginTop: 8,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primary + '20',
      gap: 8,
    },
    syncButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary,
    },
    spinning: {
      transform: [{ rotate: '180deg' }],
    },
    devicesSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 16,
    },
    deviceCard: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...shadows.small,
    },
    deviceInfo: {
      gap: 12,
    },
    deviceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    deviceBadges: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.background,
      gap: 6,
    },
    statusBadgeOnline: {
      backgroundColor: colors.success + '20',
    },
    statusBadgeOffline: {
      backgroundColor: colors.mutedForeground + '20',
    },
    statusBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.mutedForeground,
    },
    statusBadgeDotOnline: {
      backgroundColor: colors.success,
    },
    statusBadgeText: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '500',
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '20',
    },
    categoryBadgeText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    assignButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary + '20',
      gap: 6,
    },
    assignButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.primary,
    },
    assignedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.success + '20',
      gap: 6,
    },
    assignedText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.success,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    modalCloseButton: {
      padding: 8,
    },
  });

