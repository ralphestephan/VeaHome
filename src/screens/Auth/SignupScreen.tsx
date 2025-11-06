import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface Props {
  onSwitchToLogin?: () => void;
}

export default function SignupScreen({ onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <LinearGradient colors={["#0a0b1a", "#1a1047"]} style={styles.container}>
      <View style={styles.iconWrap}>
        <Image
          source={require('../../assets/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>Create your VeaHome account</Text>
      <Text style={styles.subtitle}>Set up your smart home in minutes</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
        <LinearGradient colors={["#5762ff", "#6f3bea"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
          {submitting ? <ActivityIndicator color="#E6E9FF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitchToLogin ?? (() => navigation.navigate('Login'))}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    color: '#E6E9FF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#A9B0FF',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#17123a',
    borderColor: '#3b35a3',
    borderWidth: 1.2,
    color: '#E6E9FF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 54,
    borderRadius: 18,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  buttonGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#E6E9FF',
    fontWeight: '600',
  },
  link: {
    color: '#7A84FF',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});


