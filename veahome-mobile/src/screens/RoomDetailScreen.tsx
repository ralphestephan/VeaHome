import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { mockRooms } from '../constants/mockData';
import Header from '../components/Header';
import DeviceTile from '../components/DeviceTile';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

type Props = {
  route: RouteProp<RootStackParamList, 'RoomDetail'>;
};

export default function RoomDetailScreen({ route }: Props) {
  const { roomId } = route.params;
  const room = mockRooms.find(r => r.id === roomId) || mockRooms[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={room.name} showBack />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Room Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <MaterialCommunityIcons
              name="thermometer"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.temperature}°C</Text>
          </View>
          <View style={styles.statPill}>
            <MaterialCommunityIcons
              name="water-percent"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.humidity}%</Text>
          </View>
          <View style={styles.statPill}>
            <MaterialCommunityIcons
              name="air-filter"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>Air Quality: {room.airQuality}</Text>
          </View>
        </View>

        {/* Current Scene */}
        <View style={styles.sceneCard}>
          <View>
            <Text style={styles.sceneLabel}>Current Scene</Text>
            <Text style={styles.sceneName}>{room.scene}</Text>
          </View>
          <TouchableOpacity style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="lightbulb"
              size={12}
              color="white"
            />
            <Text style={styles.infoText}>{room.lights} lights on</Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={12}
              color="white"
            />
            <Text style={styles.infoText}>{room.power}</Text>
          </View>
        </View>

        {/* Devices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices in this room</Text>
          {room.devices.length > 0 ? (
            <View style={styles.devicesGrid}>
              {room.devices.map((device) => (
                <View key={device.id} style={styles.deviceItem}>
                  <DeviceTile device={device} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="devices"
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={styles.emptyText}>No devices configured yet</Text>
              <TouchableOpacity style={styles.addDeviceButton}>
                <Text style={styles.addDeviceText}>Add Device</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Controls</Text>
          <View style={styles.controlsGrid}>
            <TouchableOpacity style={styles.controlCard}>
              <MaterialCommunityIcons
                name="lightbulb"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>All Lights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCard}>
              <MaterialCommunityIcons
                name="thermometer"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Climate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCard}>
              <MaterialCommunityIcons
                name="window-shutter"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Shutters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCard}>
              <MaterialCommunityIcons
                name="music"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Audio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: colors.foreground,
  },
  sceneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sceneLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  sceneName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  changeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 124, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  infoText: {
    fontSize: 10,
    color: 'white',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  deviceItem: {
    width: '47%',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  addDeviceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addDeviceText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  controlCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlText: {
    fontSize: 10,
    color: colors.foreground,
    textAlign: 'center',
  },
});