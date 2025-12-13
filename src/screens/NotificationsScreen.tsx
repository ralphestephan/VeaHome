import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { BellRing, AlertTriangle, Activity } from 'lucide-react-native';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, colors as defaultColors, spacing, borderRadius } from '../constants/theme';
import { useNotifications, NotificationItem } from '../context/NotificationsContext';

type FilterValue = 'all' | NotificationItem['category'];

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Alerts', value: 'alert' },
  { label: 'Automations', value: 'automation' },
  { label: 'System', value: 'system' },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryPalette = useMemo(() => createCategoryPalette(colors), [colors]);
  const { notifications, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<FilterValue>('all');

  const visibleNotifications = useMemo(() => {
    if (filter === 'all') {
      return notifications;
    }
    return notifications.filter((notification) => notification.category === filter);
  }, [filter, notifications]);

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const handleDetailsPress = (notification: NotificationItem) => {
    Alert.alert(notification.title, notification.message);
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const colorToken = categoryPalette[item.category];
    const IconComponent = item.category === 'alert' ? AlertTriangle : item.category === 'automation' ? BellRing : Activity;

    return (
      <View style={[styles.card, { borderColor: colorToken.border }]}>
        <View style={[styles.iconBadge, { backgroundColor: colorToken.background }]}>
          <IconComponent size={18} color={colorToken.foreground} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <View style={styles.cardFooter}>
            <View style={[styles.statusPill, { backgroundColor: colorToken.pill }]}>
              <Text style={[styles.statusText, { color: colorToken.foreground }]}>
                {item.category === 'automation' ? 'Automation' : item.category === 'system' ? 'System' : 'Alert'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.secondaryAction}
              onPress={() => handleDetailsPress(item)}
            >
              <Text style={styles.secondaryActionText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Notifications" showBack />
      <View style={styles.container}>
        <View style={styles.filterRow}>
          <ScrollView
            style={styles.filterScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {filters.map((filterOption) => {
              const isActive = filterOption.value === filter;
              return (
                <TouchableOpacity
                  key={filterOption.value}
                  onPress={() => setFilter(filterOption.value)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {filterOption.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Recent activity</Text>
              <TouchableOpacity
                style={styles.clearButton}
                activeOpacity={0.85}
                onPress={handleMarkAllRead}
              >
                <Text style={styles.clearButtonText}>Mark all read</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>Automation logs will land here the moment something requires your attention.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors = defaultColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      paddingTop: spacing.md,
      marginTop: spacing.xs,
      gap: spacing.md,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    filterScroll: {
      flexGrow: 1,
      flexShrink: 1,
    },
    filterChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingRight: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Poppins_500Medium',
    },
    filterLabelActive: {
      color: colors.background,
    },
    clearButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearButtonText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 12,
      color: colors.foreground,
    },
    sectionLabel: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    listContent: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.secondary,
      borderWidth: 1,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBody: {
      flex: 1,
      gap: spacing.xs,
    },
    cardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitle: {
      flex: 1,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
      marginRight: spacing.sm,
    },
    cardTime: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    cardMessage: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 1.2,
      borderRadius: borderRadius.lg,
    },
    statusText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    secondaryAction: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 1.2,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 12,
      color: colors.foreground,
    },
    emptyState: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyTitle: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    emptySubtitle: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

const createCategoryPalette = (colors: ThemeColors) => ({
  alert: {
    foreground: colors.destructive,
    background: `${colors.destructive}22`,
    border: `${colors.destructive}55`,
    pill: `${colors.destructive}1A`,
  },
  automation: {
    foreground: colors.primary,
    background: `${colors.primary}22`,
    border: `${colors.primary}55`,
    pill: `${colors.primary}1A`,
  },
  system: {
    foreground: colors.info,
    background: `${colors.info}22`,
    border: `${colors.info}55`,
    pill: `${colors.info}1A`,
  },
});
