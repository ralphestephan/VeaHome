import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Plus } from 'lucide-react-native';
import Header from '../components/Header';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomesApi } from '../services/api';

export default function HomeSelectorScreen() {
  const { user, token, homes, currentHomeId, setCurrentHomeId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [homeList, setHomeList] = useState(homes || []);
  const client = getApiClient(async () => token);
  const homesApi = HomesApi(client);

  const loadHomes = async () => {
    try {
      setLoading(true);
      const res = await homesApi.listHomes().catch(() => ({ data: homes }));
      setHomeList(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load homes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomes();
  }, []);

  const handleCreateHome = async () => {
    try {
      setLoading(true);
      const res = await homesApi.createHome('My Home');
      await loadHomes();
      if (res.data?.id) setCurrentHomeId(res.data.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to create home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Select Home" showBack />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Choose a home to manage</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateHome}>
          <Plus size={16} color="white" />
          <Text style={styles.addButtonText}>New Home</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading homes...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {homeList.map(h => (
            <TouchableOpacity
              key={h.id}
              style={[styles.homeCard, currentHomeId === h.id && styles.homeCardActive]}
              onPress={() => setCurrentHomeId(h.id)}
            >
              <View style={styles.homeIcon}>
                <Home size={18} color={colors.primary} />
              </View>
              <Text style={styles.homeName}>{h.name}</Text>
            </TouchableOpacity>
          ))}
          {homeList.length === 0 && (
            <Text style={styles.empty}>No homes yet</Text>
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
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  homeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.secondary, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  homeCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  homeIcon: { width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  homeName: { color: colors.foreground, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
});


