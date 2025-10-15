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
import { mockScenes } from '../constants/mockData';

export default function ScenesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Scenes</Text>
          <Text style={styles.subtitle}>Smart automation</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Scenes</Text>
          {mockScenes.filter(s => s.isActive).map((scene) => (
            <TouchableOpacity key={scene.id} style={styles.activeSceneCard}>
              <View style={styles.sceneIconContainer}>
                <MaterialCommunityIcons
                  name={scene.icon as any}
                  size={24}
                  color="white"
                />
              </View>
              <View style={styles.sceneContent}>
                <Text style={styles.sceneName}>{scene.name}</Text>
                {scene.schedule && (
                  <Text style={styles.sceneSchedule}>{scene.schedule} • Auto</Text>
                )}
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Scenes</Text>
          <View style={styles.scenesGrid}>
            {mockScenes.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={[
                  styles.sceneCard,
                  scene.isActive && styles.activeCard,
                ]}
              >
                <View
                  style={[
                    styles.cardIcon,
                    scene.isActive && styles.activeCardIcon,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={scene.icon as any}
                    size={24}
                    color={scene.isActive ? 'white' : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.cardName,
                    scene.isActive && styles.activeCardText,
                  ]}
                >
                  {scene.name}
                </Text>
                {scene.schedule && (
                  <Text
                    style={[
                      styles.cardSchedule,
                      scene.isActive && styles.activeCardSchedule,
                    ]}
                  >
                    {scene.schedule}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Create Custom Scene */}
        <TouchableOpacity style={styles.createCard}>
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={32}
            color={colors.primary}
          />
          <Text style={styles.createText}>Create Custom Scene</Text>
          <Text style={styles.createSubtext}>Automate your smart home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  activeSceneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  sceneIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneContent: {
    flex: 1,
  },
  sceneName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  sceneSchedule: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
  },
  scenesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sceneCard: {
    width: '47%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeCard: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCardIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  activeCardText: {
    color: 'white',
  },
  cardSchedule: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  activeCardSchedule: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  createCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.muted,
    borderStyle: 'dashed',
  },
  createText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  createSubtext: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});