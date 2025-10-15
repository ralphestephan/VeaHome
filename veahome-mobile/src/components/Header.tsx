import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showProfile?: boolean;
}

export default function Header({ title, showBack = false, showProfile = true }: HeaderProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <Image
            source={require('../assets/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      
      {showProfile && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialCommunityIcons name="account" size={20} color={colors.foreground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});