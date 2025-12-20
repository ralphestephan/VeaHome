import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Plus, Trash2, UserPlus, X } from 'lucide-react-native';
import Header from '../components/Header';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomesApi, HomeMembersApi } from '../services/api';

export default function HomeSelectorScreen() {
  const { user, token, homes, currentHomeId, setCurrentHomeId } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [loading, setLoading] = useState(false);
  const [homeList, setHomeList] = useState(homes || []);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyPassword, setFamilyPassword] = useState('');
  const [creatingMember, setCreatingMember] = useState(false);
  
  const client = getApiClient(async () => token);
  const homesApi = HomesApi(client);
  const membersApi = HomeMembersApi(client);

  const unwrap = (data: any) => (data && typeof data === 'object' && 'data' in data ? (data as any).data : data);

  const loadHomes = async () => {
    try {
      setLoading(true);
      const res = await homesApi.listHomes().catch(() => ({ data: homes }));
      const payload = unwrap(res.data);
      const list = Array.isArray(payload) ? payload : Array.isArray(homes) ? homes : [];
      setHomeList(list);
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
      const created = unwrap(res.data);
      if (created?.id) setCurrentHomeId(created.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to create home');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHome = (homeId: string, homeName: string) => {
    Alert.alert(
      'Delete Home',
      `Are you sure you want to delete "${homeName}"? This will permanently delete all rooms, devices, scenes, and automations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await client.delete(`/homes/${homeId}`);
              await loadHomes();
              if (currentHomeId === homeId) {
                const remaining = homeList.filter(h => h.id !== homeId);
                if (remaining.length > 0) {
                  setCurrentHomeId(remaining[0].id);
                } else {
                  setCurrentHomeId('');
                }
              }
              Alert.alert('Success', 'Home deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete home');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateFamilyMember = async () => {
    if (!familyName.trim() || !familyEmail.trim() || !familyPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(familyEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (familyPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const homeId = currentHomeId || user?.homeId;
    if (!homeId) {
      Alert.alert('Error', 'No home selected');
      return;
    }

    try {
      setCreatingMember(true);
      await membersApi.createFamilyMember(homeId, {
        name: familyName,
        email: familyEmail,
        password: familyPassword,
        role: 'member'
      });
      
      Alert.alert('Success', `Family member ${familyName} created successfully! They can now login with their email and password.`);
      setShowFamilyModal(false);
      setFamilyName('');
      setFamilyEmail('');
      setFamilyPassword('');
    } catch (error: any) {
      console.error('Error creating family member:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create family member');
    } finally {
      setCreatingMember(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Select Home"
        showBack
        showSettings={false}
      />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Choose a home to manage</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowFamilyModal(true)}>
            <UserPlus size={16} color="white" />
            <Text style={styles.addButtonText}>Family</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateHome}>
            <Plus size={16} color="white" />
            <Text style={styles.addButtonText}>New Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading homes...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {(Array.isArray(homeList) ? homeList : []).map(h => (
            <View key={h.id} style={[styles.homeCard, currentHomeId === h.id && styles.homeCardActive]}>
              <TouchableOpacity
                style={styles.homeCardMain}
                onPress={() => setCurrentHomeId(h.id)}
              >
                <View style={styles.homeIcon}>
                  <Home size={18} color={colors.primary} />
                </View>
                <Text style={styles.homeName}>{h.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteHome(h.id, h.name)}
              >
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
          {(Array.isArray(homeList) ? homeList : []).length === 0 && (
            <Text style={styles.empty}>No homes yet</Text>
          )}
        </ScrollView>
      )}

      {/* Family Member Creation Modal */}
      <Modal
        visible={showFamilyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Family Member</Text>
              <TouchableOpacity onPress={() => setShowFamilyModal(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Create a new user account and add them to your home. They can login with these credentials.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor={colors.mutedForeground}
                value={familyName}
                onChangeText={setFamilyName}
                editable={!creatingMember}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor={colors.mutedForeground}
                value={familyEmail}
                onChangeText={setFamilyEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!creatingMember}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor={colors.mutedForeground}
                value={familyPassword}
                onChangeText={setFamilyPassword}
                secureTextEntry
                editable={!creatingMember}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFamilyModal(false)}
                disabled={creatingMember}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, creatingMember && styles.createButtonDisabled]}
                onPress={handleCreateFamilyMember}
                disabled={creatingMember}
              >
                {creatingMember ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.createButtonText}>Create Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  subtitle: { fontSize: 11, color: colors.mutedForeground },
  headerButtons: { flexDirection: 'row', gap: spacing.sm },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  homeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  homeCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  homeCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  homeIcon: { width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  homeName: { flex: 1, color: colors.foreground, fontWeight: '600' },
  deleteButton: { padding: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border },
  empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.large },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: 'white' },
  modalDescription: { fontSize: fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.lg, lineHeight: 20 },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: 'white', marginBottom: spacing.xs },
  input: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.base, color: 'white', borderWidth: 1, borderColor: colors.border },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: 'white', fontWeight: '600', fontSize: fontSize.base },
  createButton: { backgroundColor: colors.primary },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { color: 'white', fontWeight: '600', fontSize: fontSize.base },
});




