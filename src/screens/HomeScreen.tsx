import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { spacing, borderRadius, fontSize, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { width } = Dimensions.get('window');
const heroGif = require('../../assets/SmartHome_DM_1.gif');
const logo = require('../assets/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png');

export default function HomeScreen({ navigation }: Props) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const handleGetStarted = () => {
    navigation.replace('Dashboard');
  };

  return (
    <LinearGradient colors={['#03071a', '#051d42', '#020b24']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Immersive control</Text>
            <Text style={styles.heroTitle}>Deep blue calm meets responsive living.</Text>
            <Text style={styles.heroSubtitle}>
              Orchestrate lighting, comfort, and security scenes with a single tap inspired by the
              cinematic entry you shared.
            </Text>
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted} activeOpacity={0.9}>
                <Text style={styles.primaryButtonText}>Launch Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <Text style={styles.metricValue}>24</Text>
                <Text style={styles.metricLabel}>Connected zones</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricValue}>0.82 kWh</Text>
                <Text style={styles.metricLabel}>Live energy</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroMedia}>
            <Image source={heroGif} style={styles.heroGif} resizeMode="cover" />
            <View style={styles.heroOverlay}>
              <View style={styles.heroBadgeIcon}>
                <MaterialCommunityIcons name="white-balance-sunny" size={18} color={colors.foreground} />
              </View>
              <View>
                <Text style={styles.overlayLabel}>Live Scene</Text>
                <Text style={styles.overlayValue}>Aurora Flow</Text>
                <Text style={styles.overlaySub}>Lights 47% · Climate 22°C</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerStrip}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.footerText}>VeaHome · Crafted for next-gen homes.</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width - spacing.xl * 1.5,
    gap: spacing.lg,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8, 12, 32, 0.8)',
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroCopy: {
    flex: 1,
    paddingRight: spacing.lg,
    justifyContent: 'space-between',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSize.xxxl,
    color: colors.foreground,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  primaryButtonText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    width: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: fontSize.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricChip: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  metricValue: {
    fontSize: fontSize.xl,
    color: colors.foreground,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  heroMedia: {
    flex: 1,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGif: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xxl,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(4, 11, 31, 0.85)',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  overlayValue: {
    fontSize: fontSize.xl,
    color: colors.foreground,
    fontWeight: '700',
  },
  overlaySub: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  footerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 12, 32, 0.7)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logo: {
    width: 120,
    height: 48,
  },
  footerText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});