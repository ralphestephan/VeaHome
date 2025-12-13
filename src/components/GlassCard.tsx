import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  gradient?: readonly [string, string];
  onPress?: () => void;
  disabled?: boolean;
};

export default function GlassCard({
  children,
  style,
  containerStyle,
  gradient,
  onPress,
  disabled = false,
}: GlassCardProps) {
  const { colors } = useTheme();
  const resolvedGradient = gradient ?? gradients.card;
  const cardStyle = [
    styles.card,
    { borderColor: colors.border },
    style,
  ];
  const content = (
    <LinearGradient
      colors={resolvedGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={[containerStyle, disabled && styles.disabled]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  if (containerStyle) {
    return <View style={containerStyle}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
  },
  disabled: {
    opacity: 0.6,
  },
});
