import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Save, X, Check } from 'lucide-react-native';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiClient, HomeMembersApi } from '../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '../components/Toast';
import Header from '../components/Header';

type RouteProp = {
  key: string;
  name: string;
  params: {
    memberId: string;
    homeId: string;
  };
};

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to everything' },
  { value: 'admin', label: 'Admin', description: 'Can manage members and devices' },
  { value: 'member', label: 'Member', description: 'Can control devices and scenes' },
];

export default function MemberEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token } = useAuth();
  const { showToast } = useToast();
  const { memberId, homeId } = route.params;

  const [member, setMember] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  useEffect(() => {
    loadMember();
  }, [memberId, homeId]);

  const loadMember = async () => {
    try {
      setLoading(true);
      const client = getApiClient(async () => token);
      const api = HomeMembersApi(client);
      const response = await api.getMembers(homeId);
      const members = response.data?.data || response.data || [];
      const foundMember = Array.isArray(members) ? members.find((m: any) => m.userId === memberId || m.id === memberId) : null;
      
      if (foundMember) {
        setMember(foundMember);
        setName(foundMember.user?.name || '');
        setEmail(foundMember.user?.email || '');
        setRole(foundMember.role || 'member');
      } else {
        Alert.alert('Error', 'Member not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error loading member:', error);
      Alert.alert('Error', 'Failed to load member data', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Name is required', { type: 'error' });
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Valid email is required', { type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const client = getApiClient(async () => token);
      const api = HomeMembersApi(client);

      const payload: any = {
        role,
      };

      // Backend only supports role update for now
      await api.updateMember(homeId, memberId, payload);
      showToast('Member updated successfully', { type: 'success' });
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error: any) {
      console.error('Error updating member:', error);
      showToast(error?.response?.data?.error || error?.message || 'Failed to update member', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === role);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Edit Member" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Edit Member"
        showBack
        actionSlot={
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Save size={20} color="#fff" />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter member name"
            placeholderTextColor={colors.mutedForeground}
            editable={!saving}
          />
        </View>

        {/* Email */}
        <View style={styles.section}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />
        </View>

        {/* Role */}
        <View style={styles.section}>
          <Text style={styles.label}>Role</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setRolePickerVisible(true)}
            disabled={member?.role === 'owner' || saving}
          >
            <View style={styles.pickerContent}>
              <View>
                <Text style={styles.pickerLabel}>{selectedRole?.label || 'Select Role'}</Text>
                <Text style={styles.pickerDescription}>{selectedRole?.description || ''}</Text>
              </View>
              {member?.role === 'owner' && (
                <Text style={styles.readOnlyText}>(Cannot change owner role)</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Bottom Save Button */}
      <TouchableOpacity
        style={[styles.saveButtonBottom, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Save size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Role Picker Modal */}
      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setRolePickerVisible(false)} style={styles.modalCloseButton}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ROLES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === role;
                return (
                  <TouchableOpacity
                    style={[styles.roleItem, isSelected && styles.roleItemSelected]}
                    onPress={() => {
                      setRole(item.value);
                      setRolePickerVisible(false);
                    }}
                  >
                    <View style={styles.roleItemContent}>
                      <Text style={[styles.roleItemLabel, isSelected && styles.roleItemLabelSelected]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.roleItemDescription, isSelected && styles.roleItemDescriptionSelected]}>
                        {item.description}
                      </Text>
                    </View>
                    {isSelected && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.sm,
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
    pickerButton: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerLabel: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    pickerDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    readOnlyText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
    saveButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.neonPrimary,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.neonPrimary,
    },
    saveButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: '#fff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      maxHeight: '60%',
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roleItemSelected: {
      backgroundColor: colors.primary + '10',
    },
    roleItemContent: {
      flex: 1,
    },
    roleItemLabel: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    roleItemLabelSelected: {
      color: colors.primary,
    },
    roleItemDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    roleItemDescriptionSelected: {
      color: colors.primary + 'CC',
    },
  });

