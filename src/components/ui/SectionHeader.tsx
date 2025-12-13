import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
}

/**
 * SectionHeader - Consistent section divider with title, optional subtitle, icon, and action
 * Used throughout the app to organize content sections
 */
export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftContent}>
        {Icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
            <Icon size={16} color={colors.primary} />
          </View>
        )}
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {action && (
        <AnimatedPressable onPress={action.onPress}>
          <View style={styles.actionContainer}>
            <Text style={[styles.actionLabel, { color: colors.primary }]}>
              {action.label}
            </Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
