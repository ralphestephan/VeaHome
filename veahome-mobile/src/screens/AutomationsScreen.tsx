import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wand2, Plus, Trash2 } from 'lucide-react-native';
import Header from '../components/Header';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiClient, AutomationsApi } from '../services/api';

export default function AutomationsScreen() {
  const { token, currentHomeId } = useAuth();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const client = getApiClient(async () => token);
  const automationsApi = AutomationsApi(client);
  const homeId = currentHomeId;

  const loadAutomations = async () => {
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await automationsApi.listAutomations(homeId).catch(() => ({ data: [] }));
      setAutomations(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAutomations(); }, [homeId]);

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

  const handleDelete = async (id: string) => {
    if (!homeId) return;
    try {
      await automationsApi.deleteAutomation(homeId, id);
      loadAutomations();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete automation');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Automations" showBack />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{automations.length} automations</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Plus size={16} color="white" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading automations...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {automations.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.icon}>
                  <Wand2 size={18} color={colors.primary} />
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.cardTitle}>{a.name}</Text>
                  <Text style={styles.cardSubtitle}>{a.trigger?.type || 'custom'} • {a.trigger?.at || ''}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(a.id)}>
                  <Trash2 size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {automations.length === 0 && (
            <Text style={styles.empty}>No automations yet</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  subtitle: { fontSize: 11, color: colors.mutedForeground },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  addButtonText: { color: 'white', fontWeight: '600' },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  card: { backgroundColor: colors.secondary, borderRadius: borderRadius.lg, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  cardTitle: { color: colors.foreground, fontWeight: '600' },
  cardSubtitle: { color: colors.mutedForeground, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl },
});


