import React, { ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors as defaultColors, spacing, borderRadius, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface CreationHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: string;
  actionSlot?: ReactNode;
  children?: ReactNode;
}

export default function CreationHero({
  eyebrow,
  title,
  description,
  meta,
  actionSlot,
  children,
}: CreationHeroProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {actionSlot ? <View style={styles.actionSlot}>{actionSlot}</View> : null}
      </View>
      {meta ? (
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{meta}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors = defaultColors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.secondary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    copy: {
      flex: 1,
      gap: spacing.xs,
    },
    eyebrow: {
      fontSize: 11,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
      letterSpacing: 1,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.foreground,
      fontFamily: 'Poppins_600SemiBold',
    },
    description: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    actionSlot: {
      marginLeft: spacing.md,
    },
    metaPill: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '600',
    },
  });
