import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layers, Plus, Trash2 } from 'lucide-react-native';
import Header from '../components/Header';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiClient, DeviceGroupsApi } from '../services/api';

export default function DeviceGroupsScreen() {
  const { token, currentHomeId } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const client = getApiClient(async () => token);
  const groupsApi = DeviceGroupsApi(client);

  const homeId = currentHomeId;

  const loadGroups = async () => {
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await groupsApi.listGroups(homeId).catch(() => ({ data: [] }));
      setGroups(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, [homeId]);

  const handleCreate = async () => {
    if (!homeId) return;
    try {
      const payload = { name: 'New Group', deviceIds: [] };
      await groupsApi.createGroup(homeId, payload);
      loadGroups();
    } catch (e) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!homeId) return;
    try {
      await groupsApi.deleteGroup(homeId, id);
      loadGroups();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete group');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Device Groups" showBack />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{groups.length} groups</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Plus size={16} color="white" />
          <Text style={styles.addButtonText}>Add Group</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {groups.map((g) => (
            <View key={g.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.icon}>
                  <Layers size={18} color={colors.primary} />
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.cardTitle}>{g.name}</Text>
                  <Text style={styles.cardSubtitle}>{Array.isArray(g.deviceIds) ? g.deviceIds.length : 0} devices</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(g.id)}>
                  <Trash2 size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {groups.length === 0 && (
            <Text style={styles.empty}>No device groups yet</Text>
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



