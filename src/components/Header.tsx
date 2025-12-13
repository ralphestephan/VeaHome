import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, TextStyle, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell as BellIcon, Settings, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as defaultColors, spacing, borderRadius, ThemeColors, fontSize, fontWeight } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationsContext';

interface HeaderProps {
  /** Page title - renders with gradient effect */
  title?: string;
  /** Subtitle text below title */
  subtitle?: string;
  /** Show back navigation button */
  showBack?: boolean;
  /** Show settings button (navigates to Settings) */
  showSettings?: boolean;
  /** Show the VeaHome logo */
  showBranding?: boolean;
  /** Override notification count */
  notificationsCount?: number;
  /** Show notifications bell icon */
  showNotifications?: boolean;
  /** Show profile avatar button */
  showProfile?: boolean;
  /** Compact mode - less vertical padding */
  compact?: boolean;
  /** Custom right content */
  rightContent?: React.ReactNode;
}

const BRAND_GRADIENT = ['#00C2FF', '#4F6EF7', '#B366FF'] as const;
const BRAND_LOGO = require('../../assets/VeaHome.png');

/**
 * Header - App navigation header with branding and actions
 * Supports multiple configurations for different screen types
 */
export default function Header({
  title,
  subtitle,
  showBack = false,
  showSettings = false,
  showBranding = true,
  notificationsCount,
  showNotifications = false,
  showProfile = false,
  compact = false,
  rightContent,
}: HeaderProps) {
  const navigation = useNavigation<any>();
  const { colors, gradients } = useTheme();
  const { unreadCount } = useNotifications();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  const effectiveNotifications =
    typeof notificationsCount === 'number' ? notificationsCount : unreadCount;
  const hasNotificationsBadge = typeof effectiveNotifications === 'number' && effectiveNotifications > 0;
  const notificationsLabel = hasNotificationsBadge
    ? effectiveNotifications > 99
      ? '99+'
      : effectiveNotifications.toString()
    : '';

  const renderTitleText = (extraStyle?: StyleProp<TextStyle>) => (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      style={[styles.title, extraStyle]}
    >
      {title}
    </Text>
  );

  const renderTitle = () => (
    <View style={styles.titleWrapper}>
      <MaskedView maskElement={renderTitleText()}>
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.titleGradient}
        >
          {renderTitleText(styles.hiddenText)}
        </LinearGradient>
      </MaskedView>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );

  const renderWordmark = () => (
    <Image
      source={BRAND_LOGO}
      style={styles.brandLogo}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="VeaHome"
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          {/* Left section */}
          <View style={styles.leftSection}>
            {showBack ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <View style={styles.iconButtonInner}>
                  <ChevronLeft size={22} color={colors.foreground} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
          </View>

          {/* Center - branding */}
          {showBranding ? (
            <View style={styles.brandingContainer}>{renderWordmark()}</View>
          ) : (
            <View style={styles.brandingSpacer} />
          )}

          {/* Right section */}
          <View style={styles.rightSection}>
            {rightContent ? (
              rightContent
            ) : (
              <View style={styles.rightActions}>
                {showNotifications && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('Notifications')}
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconButtonInner}>
                      <BellIcon size={18} color={colors.foreground} />
                      {hasNotificationsBadge && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText} numberOfLines={1}>
                            {notificationsLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                {showSettings && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconButtonInner}>
                      <Settings size={18} color={colors.foreground} />
                    </View>
                  </TouchableOpacity>
                )}
                {showProfile && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('Profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Profile"
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconButtonInner, styles.profileButton]}>
                      <User size={18} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                )}
                {!showNotifications && !showSettings && !showProfile && (
                  <View style={styles.iconPlaceholder} />
                )}
              </View>
            )}
          </View>
        </View>

        {title && renderTitle()}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors = defaultColors, compact: boolean = false) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: spacing.lg,
      paddingVertical: compact ? spacing.xs : spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      minHeight: compact ? 56 : 72,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    rightSection: {
      minWidth: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconPlaceholder: {
      width: 40,
      height: 40,
    },
    brandingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandingSpacer: {
      flex: 1,
    },
    brandLogo: {
      width: 140,
      height: 36,
    },
    titleWrapper: {
      marginTop: compact ? spacing.xs : spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32,
    },
    title: {
      fontSize: fontSize.xxl,
      lineHeight: 30,
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: spacing.xs,
    },
    titleGradient: {
      paddingHorizontal: spacing.xs,
    },
    hiddenText: {
      opacity: 0,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconButtonInner: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    profileButton: {
      backgroundColor: colors.primary + '20',
    },
    notificationBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.destructive,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: colors.background,
    },
    notificationBadgeText: {
      fontSize: 10,
      color: '#FFFFFF',
      fontWeight: fontWeight.bold,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
      lineHeight: 12,
    },
  });