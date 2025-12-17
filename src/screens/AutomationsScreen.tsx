import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wand2, Plus, Trash2, Clock, Sun, Moon, Home, Zap } from 'lucide-react-native';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApiClient, AutomationsApi } from '../services/api';

export default function AutomationsScreen() {
  const { token, currentHomeId, user } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const isDemoMode = !token || token === 'DEMO_TOKEN';
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const client = getApiClient(async () => token);
  const automationsApi = AutomationsApi(client);
  const homeId = currentHomeId || user?.homeId;

  const unwrap = (data: any) => (data && typeof data === 'object' && 'data' in data ? (data as any).data : data);

  const automationIcons: Record<string, any> = {
    'clock': Clock,
    'sun': Sun,
    'moon': Moon,
    'home': Home,
    'zap': Zap,
    'wand': Wand2,
  };

  const loadAutomations = async () => {
    if (isDemoMode) {
      setAutomations([]);
      setLoading(false);
      return;
    }
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await automationsApi.listAutomations(homeId).catch(() => ({ data: [] }));
      const payload = unwrap(res.data);
      setAutomations(Array.isArray(payload) ? payload : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAutomations(); }, [homeId, isDemoMode]);

  const handleCreate = async () => {
    if (!homeId) return;
    try {
      const payload = { name: 'New Automation', trigger: { type: 'time', at: '08:00' }, actions: [] };
      await automationsApi.createAutomation(homeId, payload);
      loadAutomations();
    } catch (e) {
      Alert.alert('Error', 'Failed to create automation');
    }
  };

  const handleToggleAutomation = (id: string) => {
    if (isDemoMode) {
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ));
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
          {automations.map((a) => {
            const IconComponent = getAutomationIcon(a);
            return (
              <View key={a.id} style={[styles.card, a.enabled && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.icon, a.enabled && styles.iconActive]}>
                    <IconComponent size={18} color={a.enabled ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardTitle}>{a.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {a.trigger?.type || 'custom'} • {a.trigger?.at || a.trigger?.event || ''}
                    </Text>
                  </View>
                  {isDemoMode ? (
                    <Switch
                      value={a.enabled}
                      onValueChange={() => handleToggleAutomation(a.id)}
                      trackColor={{ false: colors.muted, true: colors.primary + '60' }}
                      thumbColor={a.enabled ? colors.primary : colors.mutedForeground}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => handleDelete(a.id)}>
                      <Trash2 size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
                {a.actions && a.actions.length > 0 && (
                  <Text style={styles.actionsText}>
                    {a.actions.length} action{a.actions.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
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




