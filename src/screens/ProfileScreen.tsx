import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);

  const handleUpdateContact = () => {
    Alert.alert('Contact info', 'We will let you edit these details in the next update.');
  };

  const handleSeeDevices = () => {
    navigation.navigate('Devices');
  };

  const handleViewAchievements = () => {
    navigation.navigate('Scenes');
  };

  const handleAddress = () => {
    navigation.navigate('HomeSelector');
  };

  const handleEditProfile = () => {
    Alert.alert('Edit profile', 'Profile editing is coming soon.');
  };

  const handlePrivacySettings = () => {
    navigation.navigate('Settings');
  };

  const handleSubscription = () => {
    Alert.alert('Subscription', 'Contact support to adjust your plan.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Profile"
        showBack
        showSettings={false}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account" size={48} color="white" />
          </View>
          <Text style={styles.profileName}>VeaLive Client</Text>
          <Text style={styles.profileRole}>Smart Home Owner • Premium</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>Jan 2024</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Plan</Text>
              <Text style={styles.statValue}>Premium</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Level</Text>
              <Text style={styles.statValue}>Pro</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="home" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>38</Text>
            <Text style={styles.statText}>Devices</Text>
            <Text style={styles.statChange}>+2 this week</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>156kWh</Text>
            <Text style={styles.statText}>Energy Saved</Text>
            <Text style={[styles.statChange, { color: colors.success }]}>+12% more</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statText}>Automations</Text>
            <Text style={styles.statChange}>Running daily</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="target" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statText}>Scenes</Text>
            <Text style={styles.statChange}>3 active</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <TouchableOpacity onPress={handleUpdateContact}>
              <Text style={styles.updateText}>Update</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>client@vealive.com</Text>
            </View>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>+1 234 567 8900</Text>
            </View>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          </View>

          <TouchableOpacity style={styles.infoCard} onPress={handleAddress}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>Smart Home, City</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Most Used Devices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Used Devices</Text>
            <TouchableOpacity onPress={handleSeeDevices}>
              <Text style={styles.updateText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.deviceCard}>
            <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialCommunityIcons name="lightbulb" size={20} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Living Room Lights</Text>
              <Text style={styles.deviceUsage}>Used 142 times</Text>
            </View>
            <Text style={styles.devicePercent}>45%</Text>
          </View>

          <View style={styles.deviceCard}>
            <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialCommunityIcons name="air-conditioner" size={20} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Thermostat</Text>
              <Text style={styles.deviceUsage}>Used 98 times</Text>
            </View>
            <Text style={styles.devicePercent}>32%</Text>
          </View>

          <View style={styles.deviceCard}>
            <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialCommunityIcons name="television" size={20} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Smart TV</Text>
              <Text style={styles.deviceUsage}>Used 76 times</Text>
            </View>
            <Text style={styles.devicePercent}>23%</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity onPress={handleViewAchievements}>
              <Text style={styles.updateText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.achievementsGrid}>
            <View style={styles.achievementBadge}>
              <View style={styles.achievementIcon}>
                <MaterialCommunityIcons name="trophy" size={28} color="white" />
              </View>
              <Text style={styles.achievementName}>Energy Saver</Text>
            </View>
            <View style={styles.achievementBadge}>
              <View style={styles.achievementIcon}>
                <MaterialCommunityIcons name="lightning-bolt" size={28} color="white" />
              </View>
              <Text style={styles.achievementName}>Smart User</Text>
            </View>
            <View style={styles.achievementBadge}>
              <View style={styles.achievementIcon}>
                <MaterialCommunityIcons name="star" size={28} color="white" />
              </View>
              <Text style={styles.achievementName}>Premium</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleEditProfile}>
            <MaterialCommunityIcons name="pencil" size={16} color="white" />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePrivacySettings}>
            <Text style={styles.secondaryButtonText}>Privacy Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSubscription}>
            <Text style={styles.secondaryButtonText}>Subscription Management</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: 100,
    },
    profileHeader: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
      ...shadows.neonPrimary,
    },
    avatarContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    profileName: {
      fontSize: fontSize.xl,
      fontWeight: '600',
      color: 'white',
      marginBottom: 4,
    },
    profileRole: {
      fontSize: fontSize.sm,
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    statValue: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: 'white',
      marginTop: 2,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      width: '47%',
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.primary}20`,
      ...shadows.md,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      backgroundColor: `${colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    statNumber: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 2,
    },
    statText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    statChange: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    updateText: {
      fontSize: fontSize.sm,
      color: colors.primary,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
      ...shadows.sm,
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    deviceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
      ...shadows.sm,
    },
    deviceIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deviceInfo: {
      flex: 1,
    },
    deviceName: {
      fontSize: fontSize.md,
      color: colors.foreground,
      marginBottom: 2,
    },
    deviceUsage: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    devicePercent: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.primary,
    },
    achievementsGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    achievementBadge: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      ...shadows.neonPrimary,
    },
    achievementIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    achievementName: {
      fontSize: fontSize.xs,
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
    },
    actions: {
      gap: spacing.sm,
    },
    primaryButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      ...shadows.neonPrimary,
    },
    primaryButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      ...shadows.sm,
    },
    secondaryButtonText: {
      fontSize: fontSize.md,
      fontWeight: '500',
      color: colors.foreground,
    },
  });