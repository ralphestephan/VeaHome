import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { roomsData } from '../constants/rooms';
import Header from '../components/Header';
import DeviceTile from '../components/DeviceTile';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = {
  route: RouteProp<RootStackParamList, 'RoomDetail'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomDetail'>;
};

const roomGif = require('../assets/a4be53e82fc25644b6daf11c9ce10542a9783d99.png');

export default function RoomDetailScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const room = roomsData[roomId];

  if (!room) {
    return null;
  }

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
              name="lightning-bolt"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.power}</Text>
          </View>
        </View>

        {/* Room Image */}
        {room.image && (
          <TouchableOpacity style={styles.roomPreview} activeOpacity={0.9}>
            <ImageBackground
              source={{ uri: room.image }}
              style={styles.roomImage}
              imageStyle={styles.roomImageStyle}
            >
              <LinearGradient
                colors={['transparent', 'rgba(19, 21, 42, 0.95)']}
                style={styles.roomGradient}
              >
                <View style={styles.roomContent}>
                  <View style={styles.roomHeader}>
                    <View>
                      <Text style={styles.currentSceneLabel}>Current Scene</Text>
                      <Text style={styles.roomSceneText}>{room.scene}</Text>
                    </View>
                    <TouchableOpacity style={styles.changeButton}>
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roomBadges}>
                    <View style={styles.roomBadge}>
                      <MaterialCommunityIcons name="lightbulb" size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{room.lights} lights on</Text>
                    </View>
                    <View style={styles.roomBadge}>
                      <MaterialCommunityIcons name="devices" size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{room.devices} devices</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}

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
            <TouchableOpacity 
              style={styles.controlCard}
              onPress={() => navigation.navigate('Thermostat', { roomId })}
            >
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

        {/* Devices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Devices in this room</Text>
            <TouchableOpacity>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devicesGrid}>
            <DeviceTile
              icon="lightbulb"
              name="Main Lights"
              value={70}
              unit="%"
              isActive={true}
            />
            <DeviceTile
              icon="thermometer"
              name="Thermostat"
              value={room.temperature}
              unit="°C"
              isActive={true}
            />
            <DeviceTile
              icon="lightbulb-outline"
              name="Accent Lights"
              isActive={true}
            />
            <DeviceTile
              icon="desk-lamp"
              name="Floor Lamp"
              isActive={false}
            />
            <DeviceTile
              icon="television"
              name="Smart TV"
              isActive={true}
            />
            <DeviceTile
              icon="speaker"
              name="Soundbar"
              value={65}
              unit="%"
              isActive={true}
            />
          </View>
        </View>

        {/* Climate Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Climate Control</Text>
          <View style={styles.climateCard}>
            <View style={styles.climateHeader}>
              <View style={styles.climateInfo}>
                <MaterialCommunityIcons
                  name="thermometer"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.climateLabel}>Temperature</Text>
              </View>
              <TouchableOpacity style={styles.autoButton}>
                <Text style={styles.autoButtonText}>Auto</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.climateControls}>
              <TouchableOpacity style={styles.climateButton}>
                <MaterialCommunityIcons name="snowflake" size={20} color="#60A5FA" />
              </TouchableOpacity>
              <View style={styles.climateValue}>
                <Text style={styles.climateTemp}>{room.temperature}°C</Text>
                <Text style={styles.climateTarget}>Target: 23°C</Text>
              </View>
              <TouchableOpacity style={styles.climateButton}>
                <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
              </TouchableOpacity>
            </View>
            <View style={styles.climateStats}>
              <View style={styles.climateStat}>
                <MaterialCommunityIcons name="water-percent" size={16} color={colors.primary} />
                <Text style={styles.climateStatLabel}>Humidity</Text>
                <Text style={styles.climateStatValue}>{room.humidity}%</Text>
              </View>
              <View style={styles.climateStat}>
                <MaterialCommunityIcons name="air-filter" size={16} color={colors.primary} />
                <Text style={styles.climateStatLabel}>Air Quality</Text>
                <Text style={styles.climateStatValue}>Good</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Energy Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Usage</Text>
          <View style={styles.energyCard}>
            <View style={styles.energyHeader}>
              <Text style={styles.energyLabel}>Current Power</Text>
              <View style={styles.trendBadge}>
                <MaterialCommunityIcons name="trending-down" size={12} color={colors.success} />
                <Text style={styles.trendText}>-8%</Text>
              </View>
            </View>
            <Text style={styles.energyValue}>{room.power}</Text>
            <View style={styles.energyBreakdown}>
              <View style={styles.energyItem}>
                <View style={[styles.energyBar, { width: '45%', backgroundColor: colors.primary }]} />
                <Text style={styles.energyItemText}>Lights 45%</Text>
              </View>
              <View style={styles.energyItem}>
                <View style={[styles.energyBar, { width: '55%', backgroundColor: colors.primary }]} />
                <Text style={styles.energyItemText}>Climate 55%</Text>
              </View>
            </View>
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
  roomPreview: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  roomImage: {
    height: 200,
    width: '100%',
  },
  roomImageStyle: {
    borderRadius: borderRadius.xxl,
  },
  roomGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  roomContent: {
    padding: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  currentSceneLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  roomSceneText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  changeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  roomBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  roomBadgeText: {
    fontSize: 10,
    color: 'white',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  manageText: {
    fontSize: 11,
    color: colors.primary,
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
    fontSize: 9,
    color: colors.foreground,
    textAlign: 'center',
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  climateCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
  },
  climateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  climateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  climateLabel: {
    fontSize: 13,
    color: colors.foreground,
  },
  autoButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  autoButtonText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  climateControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  climateButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  climateValue: {
    alignItems: 'center',
  },
  climateTemp: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.foreground,
  },
  climateTarget: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  climateStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  climateStat: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  climateStatLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 2,
  },
  climateStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  energyCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  energyLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    color: colors.success,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  energyBreakdown: {
    gap: spacing.sm,
  },
  energyItem: {
    gap: 4,
  },
  energyBar: {
    height: 8,
    borderRadius: 4,
  },
  energyItemText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
});