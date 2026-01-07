import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Power, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { TuyaApi } from '../services/api';
import type { AxiosInstance } from 'axios';

interface TuyaDeviceControlProps {
  device: {
    id: string;
    tuya_device_id: string;
    name: string;
    category: string | null;
    online: boolean;
    state: any;
    capabilities?: any;
  };
  apiClient: AxiosInstance;
  onStateUpdate?: () => void;
}

interface DeviceFunction {
  code: string;
  type: 'Boolean' | 'Integer' | 'Enum' | 'String' | 'Json' | 'Raw';
  values?: string; // JSON string for Enum values or range
  name?: string;
  desc?: string;
  [key: string]: any;
}

export default function TuyaDeviceControl({
  device,
  apiClient,
  onStateUpdate,
}: TuyaDeviceControlProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = createStyles(colors, gradients, shadows);
  const tuyaApi = TuyaApi(apiClient);

  const [loading, setLoading] = useState(false);
  const [localState, setLocalState] = useState(device.state || {});
  const [functions, setFunctions] = useState<DeviceFunction[]>([]);

  useEffect(() => {
    setLocalState(device.state || {});
    parseCapabilities();
  }, [device.state, device.capabilities]);

  const parseCapabilities = () => {
    try {
      const caps = device.capabilities || {};
      // Tuya capabilities structure: { functions: [...] }
      const funcs = caps.functions || caps.Functions || [];
      if (Array.isArray(funcs)) {
        setFunctions(funcs);
      } else if (typeof funcs === 'object') {
        // Sometimes it's an object with function codes as keys
        setFunctions(Object.values(funcs));
      }
    } catch (error) {
      console.error('Error parsing capabilities:', error);
      setFunctions([]);
    }
  };

  const handleControl = async (code: string, value: any) => {
    if (!device.online) {
      Alert.alert('Device Offline', 'This device is currently offline');
      return;
    }

    try {
      setLoading(true);
      await tuyaApi.controlDevice(device.id, [{ code, value }]);
      
      // Update local state optimistically
      setLocalState((prev) => ({ ...prev, [code]: value }));
      
      // Refresh device status
      await refreshStatus();
      onStateUpdate?.();
    } catch (error: any) {
      console.error('Control error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to control device');
      // Revert on error
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const response = await tuyaApi.getDeviceStatus(device.id);
      const status = response.data?.data?.status || response.data?.status || [];
      const newState: any = {};
      status.forEach((s: any) => {
        newState[s.code] = s.value;
      });
      setLocalState(newState);
    } catch (error) {
      console.error('Refresh status error:', error);
    }
  };

  const renderControl = (func: DeviceFunction) => {
    const currentValue = localState[func.code];
    const isReadOnly = func.type === 'Readonly' || func.type === 'Obje';

    switch (func.type) {
      case 'Boolean':
        return (
          <View key={func.code} style={styles.controlItem}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>
                {func.name || func.code}
              </Text>
              {func.desc && (
                <Text style={styles.controlDesc}>{func.desc}</Text>
              )}
            </View>
            <Switch
              value={Boolean(currentValue)}
              onValueChange={(val) => handleControl(func.code, val)}
              disabled={loading || isReadOnly || !device.online}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>
        );

      case 'Integer':
        // Parse range if available
        let min = 0;
        let max = 100;
        let step = 1;
        
        if (func.values) {
          try {
            const range = JSON.parse(func.values);
            if (range.min !== undefined) min = range.min;
            if (range.max !== undefined) max = range.max;
            if (range.step !== undefined) step = range.step;
          } catch (e) {
            // Ignore parse errors
          }
        }

        return (
          <View key={func.code} style={styles.controlItem}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>
                {func.name || func.code}
              </Text>
              <Text style={styles.controlValue}>
                {currentValue !== undefined ? String(currentValue) : 'N/A'}
              </Text>
            </View>
            {func.desc && (
              <Text style={styles.controlDesc}>{func.desc}</Text>
            )}
            <View style={styles.integerControls}>
              <TouchableOpacity
                style={[styles.integerButton, (currentValue === undefined || currentValue <= min || loading || isReadOnly || !device.online) && styles.integerButtonDisabled]}
                onPress={() => handleControl(func.code, Math.max(min, (currentValue || min) - step))}
                disabled={currentValue === undefined || currentValue <= min || loading || isReadOnly || !device.online}
              >
                <Text style={styles.integerButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.integerValueContainer}>
                <Text style={styles.integerValue}>{currentValue !== undefined ? currentValue : min}</Text>
              </View>
              <TouchableOpacity
                style={[styles.integerButton, (currentValue === undefined || currentValue >= max || loading || isReadOnly || !device.online) && styles.integerButtonDisabled]}
                onPress={() => handleControl(func.code, Math.min(max, (currentValue || min) + step))}
                disabled={currentValue === undefined || currentValue >= max || loading || isReadOnly || !device.online}
              >
                <Text style={styles.integerButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.controlRange}>
              Range: {min} - {max}
            </Text>
          </View>
        );

      case 'Enum':
        // Parse enum values
        let enumValues: string[] = [];
        if (func.values) {
          try {
            const parsed = JSON.parse(func.values);
            if (Array.isArray(parsed)) {
              enumValues = parsed;
            } else if (typeof parsed === 'object' && parsed.range) {
              enumValues = parsed.range;
            }
          } catch (e) {
            // Try splitting by comma
            enumValues = func.values.split(',').map((v: string) => v.trim());
          }
        }

        return (
          <View key={func.code} style={styles.controlItem}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>
                {func.name || func.code}
              </Text>
            </View>
            {func.desc && (
              <Text style={styles.controlDesc}>{func.desc}</Text>
            )}
            <View style={styles.enumContainer}>
              {enumValues.map((val: string) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.enumButton,
                    String(currentValue) === String(val) && styles.enumButtonActive,
                    (loading || isReadOnly || !device.online) && styles.enumButtonDisabled,
                  ]}
                  onPress={() => handleControl(func.code, val)}
                  disabled={loading || isReadOnly || !device.online}
                >
                  <Text
                    style={[
                      styles.enumButtonText,
                      String(currentValue) === String(val) && styles.enumButtonTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'String':
      case 'Json':
      case 'Raw':
        // Read-only display for complex types
        return (
          <View key={func.code} style={styles.controlItem}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>
                {func.name || func.code}
              </Text>
            </View>
            {func.desc && (
              <Text style={styles.controlDesc}>{func.desc}</Text>
            )}
            <View style={styles.readOnlyValue}>
              <Text style={styles.readOnlyText}>
                {currentValue !== undefined ? String(currentValue) : 'N/A'}
              </Text>
            </View>
          </View>
        );

      default:
        // Default: try to render as boolean if value exists
        if (currentValue !== undefined) {
          return (
            <View key={func.code} style={styles.controlItem}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlLabel}>
                  {func.name || func.code}
                </Text>
                <Text style={styles.controlValue}>
                  {String(currentValue)}
                </Text>
              </View>
            </View>
          );
        }
        return null;
    }
  };

  // Group functions: controls first, then read-only
  const controlFunctions = functions.filter((f) => {
    const type = f.type;
    return type !== 'Readonly' && type !== 'Obje' && type !== 'String' && type !== 'Json' && type !== 'Raw';
  });

  const readOnlyFunctions = functions.filter((f) => {
    const type = f.type;
    return type === 'Readonly' || type === 'Obje' || type === 'String' || type === 'Json' || type === 'Raw';
  });

  if (!device.online) {
    return (
      <View style={styles.offlineContainer}>
        <AlertCircle size={24} color={colors.mutedForeground} />
        <Text style={styles.offlineText}>Device is offline</Text>
      </View>
    );
  }

  if (functions.length === 0) {
    return (
      <View style={styles.noControlsContainer}>
        <Text style={styles.noControlsText}>No controls available</Text>
        <Text style={styles.noControlsSubtext}>
          Device capabilities not available. Try syncing devices.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {controlFunctions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Controls</Text>
          {controlFunctions.map((func) => renderControl(func))}
        </>
      )}

      {readOnlyFunctions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Status</Text>
          {readOnlyFunctions.map((func) => renderControl(func))}
        </>
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={refreshStatus}
        disabled={loading}
      >
        <RefreshCw size={16} color={colors.primary} />
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 8,
    },
    controlItem: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...shadows.small,
    },
    controlHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    controlLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    controlValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    controlDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 12,
    },
    controlRange: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 8,
    },
    integerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 8,
    },
    integerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    integerButtonDisabled: {
      opacity: 0.5,
      backgroundColor: colors.muted,
      borderColor: colors.border,
    },
    integerButtonText: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.primary,
    },
    integerValueContainer: {
      flex: 1,
      alignItems: 'center',
    },
    integerValue: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
    },
    enumContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    enumButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    enumButtonActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    enumButtonDisabled: {
      opacity: 0.5,
    },
    enumButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    enumButtonTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    readOnlyValue: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    readOnlyText: {
      fontSize: 14,
      color: colors.foreground,
    },
    offlineContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    offlineText: {
      fontSize: 16,
      color: colors.mutedForeground,
    },
    noControlsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 8,
    },
    noControlsText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    noControlsSubtext: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primary + '20',
      gap: 8,
      marginTop: 8,
    },
    refreshButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary,
    },
  });


