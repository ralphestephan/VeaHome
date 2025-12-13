import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../../constants/theme';
import { Mail, Lock, Sparkles, Home, Shield, Zap, Eye, EyeOff } from 'lucide-react-native';

const heroGif = require('../../../assets/VeaHome.gif');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onSwitchToSignup?: () => void;
}

export default function LoginScreen({ onSwitchToSignup }: Props) {
  const { login, loginDemo } = useAuth();
  const navigation = useNavigation<any>();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, '#0A0E1F', colors.background]}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View style={[styles.glowOrb, styles.glowOrb1, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrb2, { opacity: glowOpacity }]} />
      
      <ExpoImage
        source={heroGif}
        style={styles.backgroundArt}
        blurRadius={60}
        contentFit="cover"
      />
      <View style={styles.backdrop} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Logo and branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.primary, colors.neonPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Home size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>VeaHome</Text>
            <View style={styles.taglineRow}>
              <Sparkles size={14} color={colors.neonCyan} />
              <Text style={styles.tagline}>Smart Living, Simplified</Text>
            </View>
          </View>

          {/* Hero Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(79, 110, 247, 0.1)', 'rgba(179, 102, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCardGradient}
            >
              <View style={styles.heroMediaFrame}>
                <ExpoImage
                  source={heroGif}
                  style={styles.heroGif}
                  contentFit="cover"
                  cachePolicy="memory"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(6, 8, 22, 0.9)']}
                  style={styles.heroOverlay}
                />
                <View style={styles.heroStats}>
                  <View style={styles.heroStatItem}>
                    <Shield size={14} color={colors.success} />
                    <Text style={styles.heroStatText}>Secure</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Zap size={14} color={colors.warning} />
                    <Text style={styles.heroStatText}>42ms</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Login Form */}
          <View style={styles.formCard}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to control your smart home</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={18} color={colors.mutedForeground} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={18} color={colors.mutedForeground} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={onSubmit} 
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.neonPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.demoButton} 
              onPress={loginDemo}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(0, 194, 255, 0.15)', 'rgba(0, 255, 240, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.demoButtonGradient}
              >
                <Sparkles size={16} color={colors.neonCyan} />
                <Text style={styles.demoButtonText}>Try Demo Mode</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={onSwitchToSignup ?? (() => navigation.navigate('Signup'))}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                <Shield size={16} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>End-to-end encryption</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
                <Zap size={16} color={colors.success} />
              </View>
              <Text style={styles.featureText}>Real-time control</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundArt: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.2,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background + 'E0',
    },
    glowOrb: {
      position: 'absolute',
      borderRadius: 999,
    },
    glowOrb1: {
      width: 300,
      height: 300,
      top: -100,
      right: -100,
      backgroundColor: colors.primary,
      opacity: 0.15,
    },
    glowOrb2: {
      width: 250,
      height: 250,
      bottom: 100,
      left: -80,
      backgroundColor: colors.neonPurple,
      opacity: 0.1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: spacing.xxl + spacing.lg,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    content: {
      flex: 1,
      gap: spacing.xl,
    },
    brandSection: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoContainer: {
      marginBottom: spacing.xs,
    },
    logoGradient: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.neonPrimary,
    },
    brandName: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: 1,
    },
    taglineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    tagline: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    heroCard: {
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroCardGradient: {
      padding: spacing.sm,
    },
    heroMediaFrame: {
      height: 160,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      position: 'relative',
    },
    heroGif: {
      ...StyleSheet.absoluteFillObject,
      transform: [{ scale: 1.1 }],
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    heroStats: {
      position: 'absolute',
      bottom: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(6, 8, 22, 0.8)',
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    heroStatText: {
      fontSize: fontSize.sm,
      color: colors.foreground,
      fontWeight: '600',
    },
    heroStatDivider: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    errorContainer: {
      backgroundColor: colors.destructive + '20',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.destructive + '40',
    },
    errorText: {
      color: colors.destructive,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    inputGroup: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 56,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: fontSize.md,
      height: '100%',
    },
    passwordToggle: {
      padding: spacing.xs,
    },
    primaryButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    primaryButtonGradient: {
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    demoButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    demoButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.neonCyan + '40',
      borderRadius: borderRadius.lg,
    },
    demoButtonText: {
      color: colors.neonCyan,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    linkButton: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    linkText: {
      color: colors.mutedForeground,
      fontSize: fontSize.sm,
    },
    linkHighlight: {
      color: colors.primary,
      fontWeight: '600',
    },
    featuresRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    featureIcon: {
      width: 28,
      height: 28,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
  });


