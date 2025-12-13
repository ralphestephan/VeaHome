import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../../constants/theme';
import { Mail, Lock, User, Home, Sparkles, Shield, Eye, EyeOff, UserPlus } from 'lucide-react-native';

interface Props {
  onSwitchToLogin?: () => void;
}

export default function SignupScreen({ onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const navigation = useNavigation<any>();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [name, setName] = useState('');
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
      await register(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Sign up failed');
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
                colors={[colors.neonPurple, colors.primary]}
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
              <Text style={styles.tagline}>Create Your Smart Home</Text>
            </View>
          </View>

          {/* Signup Form */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <UserPlus size={24} color={colors.primary} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Set up your smart home in minutes</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <User size={18} color={colors.mutedForeground} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email Input */}
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

              {/* Password Input */}
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

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={onSubmit} 
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.neonPurple, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={onSwitchToLogin ?? (() => navigation.navigate('Login'))}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>What you'll get</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Shield size={16} color={colors.primary} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitLabel}>Secure Control</Text>
                  <Text style={styles.benefitDesc}>End-to-end encrypted</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.success + '20' }]}>
                  <Home size={16} color={colors.success} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitLabel}>Smart Automation</Text>
                  <Text style={styles.benefitDesc}>AI-powered routines</Text>
                </View>
              </View>
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
      top: -50,
      left: -100,
      backgroundColor: colors.neonPurple,
      opacity: 0.15,
    },
    glowOrb2: {
      width: 250,
      height: 250,
      bottom: 150,
      right: -80,
      backgroundColor: colors.primary,
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
    formCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    formHeader: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    formIconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
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
    benefitsCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    benefitsTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    benefitsList: {
      gap: spacing.md,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitText: {
      flex: 1,
    },
    benefitLabel: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
    },
    benefitDesc: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
  });


