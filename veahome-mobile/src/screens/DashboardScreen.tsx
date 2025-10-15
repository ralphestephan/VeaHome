import React, { useState } from 'react';
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
import RoomCard from '../components/RoomCard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedRoom, setSelectedRoom] = useState(mockRooms[0]);

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

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="home"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.statValue}>38</Text>
            <Text style={styles.statLabel}>Devices</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.statValue}>24.5</Text>
            <Text style={styles.statLabel}>kWh Today</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="thermometer"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.statValue}>23°</Text>
            <Text style={styles.statLabel}>Avg Temp</Text>
          </View>
        </View>

        {/* Rooms List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {mockRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={() => navigation.navigate('RoomDetail', { roomId: room.id })}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons
                name="lightbulb"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionText}>All Lights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons
                name="lock"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Lock All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons
                name="cctv"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Cameras</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons
                name="music"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Music</Text>
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
  seeAll: {
    fontSize: 12,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 10,
    color: colors.foreground,
    textAlign: 'center',
  },
});