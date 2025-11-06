import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

export default function RoomCard({ room, onPress }: RoomCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: room.image }}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(19, 21, 42, 0.9)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.name}>{room.name}</Text>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="lightbulb"
                  size={12}
                  color="white"
                />
                <Text style={styles.badgeText}>{room.lights}</Text>
              </View>
            </View>
            
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="thermometer"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.statText}>{room.temperature}°C</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="water-percent"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.statText}>{room.humidity}%</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.statText}>{room.power}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  image: {
    height: 160,
    width: '100%',
  },
  imageStyle: {
    borderRadius: borderRadius.xxl,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: borderRadius.xxl,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});