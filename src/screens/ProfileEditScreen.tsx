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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Save, X } from 'lucide-react-native';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiClient, AuthApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../components/Toast';
import Header from '../components/Header';

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token, refreshMe } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Name is required', { type: 'error' });
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Valid email is required', { type: 'error' });
      return;
    }

    // If password fields are filled, validate password change
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        showToast('Current password is required to change password', { type: 'error' });
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        showToast('New password must be at least 6 characters', { type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', { type: 'error' });
        return;
      }
    }

    try {
      setSaving(true);
      const client = getApiClient(async () => token);
      const authApi = AuthApi(client);

      // Update profile
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
      };

      // Add password change if provided
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      await authApi.updateProfile(payload);
      showToast('Profile updated successfully', { type: 'success' });
      await refreshMe();
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(error?.response?.data?.error || error?.message || 'Failed to update profile', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Edit Profile"
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
            placeholder="Enter your name"
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
            placeholder="Enter your email"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionDescription}>
            Leave blank to keep current password
          </Text>

          <View style={styles.passwordSection}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              editable={!saving}
            />
          </View>

          <View style={styles.passwordSection}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 characters)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              editable={!saving}
            />
          </View>

          <View style={styles.passwordSection}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              editable={!saving}
            />
          </View>
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
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
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
    passwordSection: {
      marginBottom: spacing.md,
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
  });

