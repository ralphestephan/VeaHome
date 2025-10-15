import React from 'react';
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
import { colors, spacing, borderRadius, fontSize } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const handleGetStarted = () => {
    navigation.replace('Dashboard');
  };

  return (
    <LinearGradient
      colors={['#0a0b1a', '#1a1047']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.primary, '#4a6ae6']}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="home" size={48} color="white" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Connect Home</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width - spacing.xl * 2,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  title: {
    fontSize: fontSize.xxxl + 4,
    color: colors.foreground,
    marginBottom: spacing.xxl,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 8,
  },
  buttonText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  logoContainer: {
    marginTop: spacing.xxl * 2,
  },
  logo: {
    width: 120,
    height: 48,
    opacity: 0.8,
  },
});