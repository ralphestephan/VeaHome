import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [energySaving, setEnergySaving] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your preferences</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <TouchableOpacity style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <MaterialCommunityIcons name="account" size={32} color="white" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>VeaLive Client</Text>
            <Text style={styles.profilePlan}>Premium Account</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="white"
          />
        </TouchableOpacity>

        {/* Home Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Home Settings</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="home" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Home Information</Text>
              <Text style={styles.settingValue}>VeaHome Smart</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="wifi" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Network & Connection</Text>
              <Text style={styles.settingValue}>Connected • 120 Mbps</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="cellphone" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Devices & Integrations</Text>
              <Text style={styles.settingValue}>38 devices connected</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
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
              <MaterialCommunityIcons name="bell" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingValue}>Push & Email alerts</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingValue}>Always on</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Energy Saving</Text>
              <Text style={styles.settingValue}>Auto optimize power</Text>
            </View>
            <Switch
              value={energySaving}
              onValueChange={setEnergySaving}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="cloud" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cloud Sync</Text>
              <Text style={styles.settingValue}>Auto sync enabled</Text>
            </View>
            <Switch
              value={cloudSync}
              onValueChange={setCloudSync}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="white"
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Download Data</Text>
              <Text style={styles.settingValue}>Export your data</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="shield" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Security Settings</Text>
              <Text style={styles.settingValue}>PIN & Biometric auth</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="lock" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingValue}>Update your password</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Help</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="help-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Help Center</Text>
              <Text style={styles.settingValue}>FAQ & Guides</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="message" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Contact Support</Text>
              <Text style={styles.settingValue}>Get help from our team</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
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
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  profilePlan: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
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
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  aboutCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  aboutVersion: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  aboutCopyright: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
});