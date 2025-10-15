import React, { useState } from 'react';
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
import InteractiveFloorPlan from '../components/InteractiveFloorPlan';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedRoom, setSelectedRoom] = useState('salon');

  const currentRoomData = roomsData[selectedRoom];

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoom(roomId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header showProfile />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VeaHome</Text>
          <Text style={styles.sectionSubtitle}>Smart Home Control</Text>
        </View>

        {/* Interactive Floor Plan */}
        <InteractiveFloorPlan
          onRoomSelect={handleRoomSelect}
          selectedRoom={selectedRoom}
        />

        {/* Room Preview Card */}
        {currentRoomData?.image && (
          <TouchableOpacity
            style={styles.roomPreview}
            onPress={() => navigation.navigate('RoomDetail', { roomId: selectedRoom })}
            activeOpacity={0.9}
          >
            <ImageBackground
              source={{ uri: currentRoomData.image }}
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
                      <Text style={styles.roomSceneText}>{currentRoomData.scene}</Text>
                    </View>
                    <TouchableOpacity style={styles.changeButton}>
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roomBadges}>
                    <View style={styles.roomBadge}>
                      <MaterialCommunityIcons name="lightbulb" size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{currentRoomData.lights} lights on</Text>
                    </View>
                    <View style={styles.roomBadge}>
                      <MaterialCommunityIcons name="lightning-bolt" size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{currentRoomData.power}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <TouchableOpacity>
              <Text style={styles.customizeText}>Customize</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="lightbulb" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>All Lights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="lock" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Lock All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="cctv" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Cameras</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="music" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Music</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="shield" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Security</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="wifi" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Network</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="volume-high" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Room Controls */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Room Controls</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RoomDetail', { roomId: selectedRoom })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlsGrid}>
            <TouchableOpacity style={[styles.controlCard, styles.activeControlCard]}>
              <View style={styles.controlIcon}>
                <MaterialCommunityIcons name="thermometer" size={20} color="white" />
              </View>
              <Text style={styles.controlValue}>{currentRoomData.temperature}°C</Text>
              <Text style={styles.controlLabel}>Climate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCard}>
              <View style={styles.controlIconSecondary}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
              </View>
              <Text style={styles.controlValueSecondary}>{currentRoomData.power}</Text>
              <Text style={styles.controlLabelSecondary}>Power</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlCard, styles.activeControlCard]}>
              <View style={styles.controlIcon}>
                <MaterialCommunityIcons name="lightbulb" size={20} color="white" />
              </View>
              <Text style={styles.controlValue}>{currentRoomData.lights}</Text>
              <Text style={styles.controlLabel}>Lights On</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCard}>
              <View style={styles.controlIconSecondary}>
                <MaterialCommunityIcons name="water-percent" size={20} color={colors.primary} />
              </View>
              <Text style={styles.controlValueSecondary}>{currentRoomData.humidity}%</Text>
              <Text style={styles.controlLabelSecondary}>Humidity</Text>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  customizeText: {
    fontSize: 11,
    color: colors.primary,
  },
  viewAllText: {
    fontSize: 11,
    color: colors.primary,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionButton: {
    width: '21%',
    aspectRatio: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: 9,
    color: colors.foreground,
    textAlign: 'center',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  controlCard: {
    width: '47%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeControlCard: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconSecondary: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlValue: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  controlValueSecondary: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
  },
  controlLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controlLabelSecondary: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});