import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  ChevronRight, 
  Home, 
  Wifi, 
  Smartphone, 
  Bell, 
  Sun, 
  Monitor, 
  Zap, 
  BellRing, 
  Mail, 
  Volume2, 
  Vibrate, 
  Cloud, 
  RotateCcw, 
  Download, 
  Trash2, 
  Shield, 
  Lock, 
  Eye, 
  HelpCircle, 
  MessageCircle, 
  Star,
  QrCode,
  LogOut,
  UserPlus,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getApiClient, HomeApi } from '../services/api';


export default function SettingsScreen() {
  const { logout, user, token } = useAuth();
  const navigation = useNavigation<any>();
  const { colors, gradients, shadows, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [notifications, setNotifications] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [energySaving, setEnergySaving] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditHomeModal, setShowEditHomeModal] = useState(false);
  const [editingHomeName, setEditingHomeName] = useState(user?.homeId ? `Home ${user.id?.slice(0, 8)}` : '');
  const [editHomeLoading, setEditHomeLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleEditHomeName = async () => {
    if (!editingHomeName.trim()) {
      Alert.alert('Error', 'Home name cannot be empty');
      return;
    }

    try {
      setEditHomeLoading(true);
      const homeId = user?.homeId || '';
      const client = getApiClient(async () => token);
      const homeApi = HomeApi(client);
      await homeApi.updateHome(homeId, { name: editingHomeName.trim() });
      Alert.alert('Success', 'Home name updated successfully');
      setShowEditHomeModal(false);
    } catch (error: any) {
      console.error('[SettingsScreen] Update home error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update home name');
    } finally {
      setEditHomeLoading(false);
    }
  };

  const handleDeleteHome = () => {
    Alert.alert(
      'Delete Home',
      'Are you sure you want to delete this home? This will permanently delete all rooms, devices, scenes, and automations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleteLoading(true);
              const homeId = user?.homeId || '';
              console.log('[SettingsScreen] Deleting home:', homeId);
              console.log('[SettingsScreen] User ID:', user?.id);
              
              const client = getApiClient(async () => token);
              const homeApi = HomeApi(client);
              await homeApi.deleteHome(homeId);
              
              console.log('[SettingsScreen] Home deleted successfully');
              Alert.alert('Success', 'Home deleted successfully', [
                { text: 'OK', onPress: () => logout() }
              ]);
            } catch (error: any) {
              console.error('[SettingsScreen] Delete home error:', error);
              console.error('[SettingsScreen] Error response:', error.response?.data);
              console.error('[SettingsScreen] Error status:', error.response?.status);
              Alert.alert('Error', error.response?.data?.error || error.response?.data?.message || 'Failed to delete home');
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleInviteUser = () => {
    navigation.navigate('HomeMembers');
  };

  const handleAddHub = () => {
    navigation.navigate('HubPair');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleHomeInfoPress = () => {
    navigation.navigate('HomeSelector');
  };

  const handleDevicesPress = () => {
    navigation.navigate('Devices');
  };

  const handleThemeToggle = (value: boolean) => {
    setMode(value ? 'dark' : 'light');
  };

  const showInfo = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const handleDownloadData = () => {
    showInfo('Data export', 'We just emailed your latest export to your inbox.');
  };

  const handleClearCache = () => {
    showInfo('Cache cleared', 'Temporary files were cleared successfully.');
  };

  const handleSecuritySettings = () => {
    showInfo('Security', 'Manage biometrics and PIN from your hub app.');
  };

  const handleChangePassword = () => {
    showInfo('Change password', 'Use the Profile screen to update your password.');
  };

  const handlePrivacyPolicy = () => {
    showInfo('Privacy policy', 'Opening policy in your browser soon.');
  };

  const handleHelpCenter = () => {
    showInfo('Help center', 'Visit help.vealive.com for detailed guides.');
  };

  const handleSupport = () => {
    showInfo('Support', 'We opened a ticket with the VeaLive team.');
  };

  const handleRateApp = () => {
    showInfo('Thank you!', 'Redirecting you to the store to leave a review.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your preferences</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <TouchableOpacity style={styles.profileCard} onPress={handleProfilePress}>
          <View style={styles.profileIcon}>
            <User size={32} color="white" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>VeaLive Client</Text>
            <Text style={styles.profilePlan}>Premium Account</Text>
          </View>
          <ChevronRight
            size={20}
            color="white"
          />
        </TouchableOpacity>

        {/* Home Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Home Settings</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowEditHomeModal(true)}>
            <View style={styles.settingIcon}>
              <Home size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Home Name</Text>
              <Text style={styles.settingValue}>Edit your home name</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleHomeInfoPress}>
            <View style={styles.settingIcon}>
              <Home size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Home Information</Text>
              <Text style={styles.settingValue}>VeaHome Smart</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => showInfo('Network & Connection', 'Manage Wi-Fi from your linked hub app.')}
          >
            <View style={styles.settingIcon}>
              <Wifi size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Network & Connection</Text>
              <Text style={styles.settingValue}>Connected • 120 Mbps</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDevicesPress}>
            <View style={styles.settingIcon}>
              <Smartphone size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Devices & Integrations</Text>
              <Text style={styles.settingValue}>38 devices connected</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleAddHub}>
            <View style={styles.settingIcon}>
              <QrCode size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Add VeaHub</Text>
              <Text style={styles.settingValue}>Scan QR code to pair</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingValue}>Push & Email alerts</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Sun size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingValue}>
                {mode === 'dark' ? 'Ambient glow' : 'Soft daylight'}
              </Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Monitor size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Auto Mode</Text>
              <Text style={styles.settingValue}>Adjust with sunlight</Text>
            </View>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Zap size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Energy Saving</Text>
              <Text style={styles.settingValue}>Auto optimize power</Text>
            </View>
            <Switch
              value={energySaving}
              onValueChange={setEnergySaving}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <BellRing size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingValue}>Real-time alerts</Text>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Mail size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingValue}>Daily summary</Text>
            </View>
            <Switch
              value={emailNotifs}
              onValueChange={setEmailNotifs}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Volume2 size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingValue}>App sounds</Text>
            </View>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Vibrate size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingValue}>Haptic feedback</Text>
            </View>
            <Switch
              value={vibration}
              onValueChange={setVibration}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Cloud size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cloud Sync</Text>
              <Text style={styles.settingValue}>Auto sync enabled</Text>
            </View>
            <Switch
              value={cloudSync}
              onValueChange={setCloudSync}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <RotateCcw size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Auto Backup</Text>
              <Text style={styles.settingValue}>Daily backups</Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={setAutoBackup}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={handleDownloadData}>
            <View style={styles.settingIcon}>
              <Download size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Download Data</Text>
              <Text style={styles.settingValue}>Export your data</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleClearCache}>
            <View style={styles.settingIcon}>
              <Trash2 size={20} color={colors.destructive} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.destructive }]}>Clear Cache</Text>
              <Text style={styles.settingValue}>Free up space</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleInviteUser}>
            <View style={styles.settingIcon}>
              <UserPlus size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Invite User</Text>
              <Text style={styles.settingValue}>Share home access</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleSecuritySettings}>
            <View style={styles.settingIcon}>
              <Shield size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Security Settings</Text>
              <Text style={styles.settingValue}>PIN & Biometric auth</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <View style={styles.settingIcon}>
              <Lock size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingValue}>Update your password</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicy}>
            <View style={styles.settingIcon}>
              <Eye size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingValue}>View policy</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleHelpCenter}>
            <View style={styles.settingIcon}>
              <HelpCircle size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Help Center</Text>
              <Text style={styles.settingValue}>FAQ & Guides</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleSupport}>
            <View style={styles.settingIcon}>
              <MessageCircle size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Contact Support</Text>
              <Text style={styles.settingValue}>Get help from our team</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleRateApp}>
            <View style={styles.settingIcon}>
              <Star size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Rate App</Text>
              <Text style={styles.settingValue}>Share your feedback</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Danger Zone</Text>
          <TouchableOpacity 
            style={[styles.settingItem, deleteLoading && styles.settingItemDisabled]} 
            onPress={handleDeleteHome}
            disabled={deleteLoading}
          >
            <View style={styles.settingIcon}>
              {deleteLoading ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <Trash2 size={20} color={colors.destructive} />
              )}
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.destructive }]}>Delete Home</Text>
              <Text style={styles.settingValue}>Permanently delete this home</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingIcon}>
              <LogOut size={20} color={colors.destructive} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.destructive }]}>Logout</Text>
              <Text style={styles.settingValue}>Sign out of your account</Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>VeaHome by VeaLive</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutCopyright}>© 2025 VeaLive. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Edit Home Name Modal */}
      <Modal visible={showEditHomeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Home Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter home name"
              placeholderTextColor={colors.mutedForeground}
              value={editingHomeName}
              onChangeText={setEditingHomeName}
              editable={!editHomeLoading}
            />
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditHomeModal(false)}
                disabled={editHomeLoading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleEditHomeName}
                disabled={editHomeLoading}
              >
                {editHomeLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '80%',
      ...shadows.md,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    modalInput: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      fontSize: fontSize.md,
      borderColor: colors.primary,
      borderWidth: 1,
    },
    modalButtonGroup: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.muted,
    },
    modalButtonSave: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: 100,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.md,
      ...shadows.neonPrimary,
    },
    profileIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: 'white',
      marginBottom: 2,
    },
    profilePlan: {
      fontSize: fontSize.sm,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
      ...shadows.sm,
    },
    settingItemDisabled: {
      opacity: 0.5,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingContent: {
      flex: 1,
    },
    settingLabel: {
      fontSize: fontSize.md,
      color: colors.foreground,
      marginBottom: 2,
    },
    settingValue: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    aboutCard: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      ...shadows.md,
    },
    aboutText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    aboutVersion: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    aboutCopyright: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      marginTop: spacing.sm,
    },
  });