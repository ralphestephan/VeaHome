import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wand2, Plus, Trash2, Clock, Sun, Moon, Home, Zap, Edit } from 'lucide-react-native';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApiClient, AutomationsApi } from '../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AutomationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { token, currentHomeId, user } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const isDemoMode = token === 'DEMO_TOKEN';
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const homeId = currentHomeId || user?.homeId;
  const client = useMemo(() => getApiClient(async () => token), [token]);
  const automationsApi = useMemo(() => AutomationsApi(client), [client]);

  const unwrap = (data: any) => (data && typeof data === 'object' && 'data' in data ? (data as any).data : data);

  const automationIcons: Record<string, any> = {
    'clock': Clock,
    'sun': Sun,
    'moon': Moon,
    'home': Home,
    'zap': Zap,
    'wand': Wand2,
  };

  const loadAutomations = useCallback(async () => {
    if (isDemoMode) {
      setAutomations([]);
      setLoading(false);
      return;
    }
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await automationsApi.listAutomations(homeId).catch(() => ({ data: [] }));
      const raw = res.data;
      // Handle different response structures - check multiple possible paths
      let payload = raw;
      if (raw?.data?.automations) payload = raw.data.automations;
      else if (raw?.automations) payload = raw.automations;
      else if (raw?.data && Array.isArray(raw.data)) payload = raw.data;
      else if (Array.isArray(raw)) payload = raw;
      
      const allAutomations = Array.isArray(payload) ? payload : [];
      
      // Debug logging
      console.log('[AutomationsScreen] Raw response:', raw);
      console.log('[AutomationsScreen] Loaded automations:', allAutomations.length);
      console.log('[AutomationsScreen] Automation IDs:', allAutomations.map((a: any) => a.id));
      console.log('[AutomationsScreen] Automation names:', allAutomations.map((a: any) => a.name));
      allAutomations.forEach((a: any) => {
        console.log(`[AutomationsScreen] Automation ${a.name} (${a.id}):`, {
          enabled: a.enabled,
          isActive: a.isActive,
          hasTrigger: !!a.trigger,
          triggerStructure: a.trigger ? Object.keys(a.trigger) : 'none',
          hasTriggers: Array.isArray(a.triggers) && a.triggers.length > 0,
          actionsCount: Array.isArray(a.actions) ? a.actions.length : 0,
          actions: a.actions,
        });
      });
      
      // Show all automations (including invalid ones) so user can delete them
      setAutomations(allAutomations);
    } catch (e) {
      Alert.alert('Error', 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, [homeId, isDemoMode, automationsApi]);

  useEffect(() => { loadAutomations(); }, [loadAutomations]);

  // Refresh when screen comes into focus (e.g., after editing/deleting)
  useFocusEffect(
    useCallback(() => {
      loadAutomations();
    }, [loadAutomations])
  );

  const handleCreate = async () => {
    if (!homeId) return;
    navigation.navigate('AutomationForm', { homeId });
  };

  const handleEdit = (automation: any) => {
    navigation.navigate('AutomationForm', { homeId, automationId: automation.id });
  };

  const handleToggleAutomation = async (id: string, currentEnabled: boolean) => {
    if (isDemoMode) {
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ));
      return;
    }
    if (!homeId) return;
    
    try {
      // Optimistically update UI
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !currentEnabled } : a
      ));
      
      // Update on backend
      await automationsApi.updateAutomation(homeId, id, { enabled: !currentEnabled });
    } catch (e) {
      // Revert on error
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: currentEnabled } : a
      ));
      Alert.alert('Error', 'Failed to toggle automation');
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      setAutomations(prev => prev.filter(a => a.id !== id));
      return;
    }
    if (!homeId) return;
    try {
      await automationsApi.deleteAutomation(homeId, id);
      loadAutomations();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete automation');
    }
  };

  const getAutomationIcon = (automation: any) => {
    const iconName = automation.icon || 'wand';
    const IconComponent = automationIcons[iconName] || Wand2;
    return IconComponent;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Automations" showBack showSettings={false} />
      <CreationHero
        eyebrow="Automation studio"
        title="Create automations"
        description="Orchestrate devices, schedules, and sensors without leaving this screen."
        meta={automations.length ? `${automations.length} configured` : 'No automations yet'}
        actionSlot={(
          <TouchableOpacity style={styles.heroActionButton} onPress={handleCreate}>
            <Plus size={16} color="white" />
            <Text style={styles.heroActionText}>Add</Text>
          </TouchableOpacity>
        )}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading automations...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {automations.filter(a => a.name && a.name.trim() !== '').map((a) => {
            const IconComponent = getAutomationIcon(a);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => handleEdit(a)}
                style={[styles.card, a.enabled && styles.cardActive]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.icon, a.enabled && styles.iconActive]}>
                    <IconComponent size={18} color={a.enabled ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardTitle}>{a.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {(() => {
                        // Handle different trigger formats
                        if (a.trigger?.type) {
                          return `${a.trigger.type}${a.trigger.at ? ` • ${a.trigger.at}` : ''}`;
                        }
                        if (a.trigger?.conditions && Array.isArray(a.trigger.conditions) && a.trigger.conditions.length > 0) {
                          const firstCond = a.trigger.conditions[0];
                          return `${firstCond.type || 'custom'}${firstCond.at ? ` • ${firstCond.at}` : ''}`;
                        }
                        if (a.triggers && Array.isArray(a.triggers) && a.triggers.length > 0) {
                          const firstTrig = a.triggers[0];
                          return `${firstTrig.type || 'custom'}${firstTrig.at ? ` • ${firstTrig.at}` : ''}`;
                        }
                        return 'custom';
                      })()}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Switch
                      value={a.enabled}
                      onValueChange={() => handleToggleAutomation(a.id, a.enabled)}
                      trackColor={{ false: colors.muted, true: colors.primary + '60' }}
                      thumbColor={a.enabled ? colors.primary : colors.mutedForeground}
                    />
                    {!isDemoMode && (
                      <TouchableOpacity onPress={() => handleDelete(a.id)} style={{ marginLeft: spacing.sm }}>
                        <Trash2 size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {a.actions && a.actions.length > 0 && (
                  <Text style={styles.actionsText}>
                    {a.actions.length} action{a.actions.length > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          {automations.length === 0 && (
            <Text style={styles.empty}>No automations yet</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    heroActionButton: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: spacing.xs, 
      backgroundColor: colors.primary, 
      paddingHorizontal: spacing.md, 
      paddingVertical: spacing.sm, 
      borderRadius: borderRadius.lg,
      ...shadows.neonPrimary,
    },
    heroActionText: { color: 'white', fontWeight: '600', fontSize: fontSize.md },
    loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
    loadingText: { fontSize: fontSize.sm, color: colors.mutedForeground },
    scrollContent: { padding: spacing.lg, gap: spacing.md },
    card: { 
      backgroundColor: colors.secondary, 
      borderRadius: borderRadius.xl, 
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    cardActive: {
      borderColor: colors.primary + '60',
      ...shadows.neonPrimary,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: { 
      width: 40, 
      height: 40, 
      borderRadius: borderRadius.lg, 
      backgroundColor: `${colors.muted}`, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    iconActive: {
      backgroundColor: `${colors.primary}20`,
    },
    titleWrap: { flex: 1 },
    cardActions: { 
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginLeft: spacing.sm,
    },
    cardTitle: { color: colors.foreground, fontWeight: '600', fontSize: fontSize.md },
    cardSubtitle: { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: 2 },
    actionsText: { 
      color: colors.mutedForeground, 
      fontSize: fontSize.xs, 
      marginTop: spacing.sm,
      marginLeft: 52,
    },
    empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl, fontSize: fontSize.md },
  });




