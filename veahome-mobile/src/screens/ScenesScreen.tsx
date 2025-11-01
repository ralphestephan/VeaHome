import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getApiClient, ScenesApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  Plus, 
  Edit, 
  Lightbulb, 
  Fan, 
  Music, 
  Target, 
  CheckCircle, 
  Clock, 
  Play, 
  LucideIcon,
  Coffee,
  Book,
  Dumbbell,
  Baby,
  Tv,
  Wind,
  Shield,
  Home,
  Calendar,
  TrendingUp,
  Bell,
  AlertCircle,
  Zap,
  Sun,
  Moon,
  Film,
  PartyPopper,
  UserX,
  BedDouble,
  Briefcase,
  UtensilsCrossed
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';

// Icon mapping for scenes
const sceneIconMap: Record<string, LucideIcon> = {
  'weather-sunset-up': Sun,
  'weather-night': Moon,
  'movie': Film,
  'party-popper': PartyPopper,
  'account-off': UserX,
  'bed': BedDouble,
  'briefcase': Briefcase,
  'silverware-fork-knife': UtensilsCrossed,
  'book-open': Book,
  'dumbbell': Dumbbell,
  'coffee': Coffee,
  'music': Music,
  'tv': Tv,
  'wind': Wind,
  'lightbulb': Lightbulb,
  'shield': Shield,
  'home': Home,
  'calendar': Calendar,
  'trending-up': TrendingUp,
  'bell': Bell,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'target': Target,
  'zap': Zap,
};

interface Scene {
  id: string;
  name: string;
  icon: string;
  devices: number;
  isActive: boolean;
  time?: string;
  description?: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScenesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const homeId = user?.homeId;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  const client = getApiClient(async () => token);
  const scenesApi = ScenesApi(client);

  useEffect(() => {
    loadScenes();
  }, [homeId]);

  const loadScenes = async () => {
    if (!homeId) {
      // Fallback to mock data
      setScenes([
        { id: "1", name: "Morning Routine", icon: "weather-sunset-up", devices: 12, isActive: false, time: "6:00 AM", description: "Wake up gently" },
        { id: "2", name: "Evening Relax", icon: "weather-night", devices: 8, isActive: true, description: "Wind down" },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await scenesApi.listScenes(homeId);
      setScenes(response.data || []);
    } catch (e) {
      console.error('Error loading scenes:', e);
      // Fallback to empty array
      setScenes([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleScene = async (id: string) => {
    if (!homeId) {
      // Local state only if no homeId
      setScenes(scenes.map(scene => 
        scene.id === id 
          ? { ...scene, isActive: !scene.isActive }
          : { ...scene, isActive: false }
      ));
      return;
    }

    try {
      const scene = scenes.find(s => s.id === id);
      if (scene && !scene.isActive) {
        // Activate scene
        await scenesApi.activateScene(homeId, id);
        // Deactivate others
        setScenes(scenes.map(s => ({
          ...s,
          isActive: s.id === id,
        })));
      }
      await loadScenes();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to toggle scene');
    }
  };

  const handleCreateScene = () => {
    if (!homeId) {
      Alert.alert('Error', 'Please set up your home first');
      return;
    }
    navigation.navigate('SceneForm', { homeId });
  };

  const handleEditScene = (sceneId: string) => {
    if (!homeId) return;
    navigation.navigate('SceneForm', { sceneId, homeId });
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!homeId) return;

    Alert.alert(
      'Delete Scene',
      'Are you sure you want to delete this scene?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await scenesApi.deleteScene(homeId, sceneId);
              await loadScenes();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to delete scene');
            }
          },
        },
      ]
    );
  };

  const activeScenes = scenes.filter(s => s.isActive);
  const inactiveScenes = scenes.filter(s => !s.isActive);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Scenes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scenes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Scenes" />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{activeScenes.length} active • {inactiveScenes.length} available</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateScene}>
          <Plus size={16} color="white" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active Scene */}
        {activeScenes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            {activeScenes.map(scene => (
              <LinearGradient
                key={scene.id}
                colors={[colors.primary, '#4a6ae6']}
                style={styles.activeSceneCard}
              >
                <View style={styles.activeSceneHeader}>
                  <View style={styles.activeSceneInfo}>
                    <View style={styles.activeSceneIcon}>
                      {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 28, color: "white" })}
                    </View>
                    <View style={styles.activeSceneContent}>
                      <Text style={styles.activeSceneName}>{scene.name}</Text>
                      <Text style={styles.activeSceneDetails}>
                        {scene.devices} devices active • {scene.description}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditScene(scene.id)}
                  >
                    <Edit size={16} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={styles.activeSceneControls}>
                  <View style={styles.controlItem}>
                    <Lightbulb size={16} color="white" />
                    <Text style={styles.controlText}>Lights: 50%</Text>
                  </View>
                  <View style={styles.controlItem}>
                    <Fan size={16} color="white" />
                    <Text style={styles.controlText}>Temp: 23°C</Text>
                  </View>
                  <View style={styles.controlItem}>
                    <Music size={16} color="white" />
                    <Text style={styles.controlText}>Music: On</Text>
                  </View>
                </View>
              </LinearGradient>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Target size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{scenes.length}</Text>            
            <Text style={styles.statLabel}>Total Scenes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <CheckCircle size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{activeScenes.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
        </View>

        {/* Popular Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Scenes</Text>
          <View style={styles.scenesGrid}>
            {inactiveScenes.slice(0, 6).map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={styles.sceneCard}
                onPress={() => toggleScene(scene.id)}
              >
                <View style={styles.sceneCardHeader}>
                  <View style={styles.sceneCardIcon}>
                    {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 24, color: colors.primary })}
                  </View>
                  <Play size={16} color={colors.mutedForeground} />
                </View>
                <Text style={styles.sceneCardName}>{scene.name}</Text>
                <View style={styles.sceneCardDetails}>
                  <Text style={styles.sceneCardDevices}>{scene.devices} devices</Text>
                  {scene.time && (
                    <>
                      <Text style={styles.sceneCardSeparator}> • </Text>
                      <Clock size={12} color={colors.mutedForeground} />
                      <Text style={styles.sceneCardTime}> {scene.time}</Text>               
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* All Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Scenes</Text>
          <View style={styles.allScenesList}>
            {inactiveScenes.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={styles.sceneListItem}
                onPress={() => toggleScene(scene.id)}
                onLongPress={() => handleDeleteScene(scene.id)}
              >
                <View style={styles.sceneListIcon}>
                  {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 20, color: colors.primary })}
                </View>
                <View style={styles.sceneListContent}>
                  <Text style={styles.sceneListName}>{scene.name}</Text>
                  <Text style={styles.sceneListDescription}>
                    {scene.devices} devices • {scene.description || 'No description'}
                  </Text>
                </View>
                {scene.time && (
                  <View style={styles.sceneListTime}>
                    <Clock size={12} color={colors.mutedForeground} />
                    <Text style={styles.sceneListTimeText}>{scene.time}</Text>
                  </View>
                )}
                <View style={styles.sceneListActions}>
                  <TouchableOpacity
                    style={styles.sceneEditButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditScene(scene.id);
                    }}
                  >
                    <Edit size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <Play size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smart Automations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Smart Automations</Text>
            <TouchableOpacity>
              <Text style={styles.manageAllText}>Manage All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.automationsList}>
            <View style={styles.automationCard}>
              <View style={styles.automationHeader}>
                <View style={styles.automationInfo}>
                  <View style={styles.automationIcon}>
                    <Clock size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.automationName}>Good Morning Routine</Text>
                    <Text style={styles.automationTime}>Weekdays at 6:00 AM</Text>
                  </View>
                </View>
                <View style={styles.automationControls}>
                  <View style={styles.automationBadge}>
                    <Text style={styles.automationBadgeText}>Active</Text>
                  </View>
                  <Switch
                    value={true}
                    onValueChange={() => {}}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>
              </View>
              <View style={styles.automationTags}>
                <View style={styles.automationTag}>
                  <Lightbulb size={12} color={colors.mutedForeground} />
                  <Text style={styles.automationTagText}>6 lights</Text>
                </View>
                <View style={styles.automationTag}>
                  <Fan size={12} color={colors.mutedForeground} />
                  <Text style={styles.automationTagText}>Heating</Text>
                </View>
                <View style={styles.automationTag}>
                  <Music size={12} color={colors.mutedForeground} />
                  <Text style={styles.automationTagText}>Music</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  createButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
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
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  manageAllText: {
    fontSize: 12,
    color: colors.primary,
  },
  activeSceneCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  activeSceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeSceneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeSceneIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeSceneContent: {
    flex: 1,
  },
  activeSceneName: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  activeSceneDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  activeSceneControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,  
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  controlText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
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
    gap: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
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
  },
  sceneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sceneCardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  sceneCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sceneCardDevices: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  sceneCardSeparator: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  sceneCardTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  allScenesList: {
    gap: spacing.sm,
  },
  sceneListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  sceneListIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneListContent: {
    flex: 1,
  },
  sceneListName: {
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 2,
  },
  sceneListDescription: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  sceneListTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  sceneListTimeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  sceneListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sceneEditButton: {
    padding: spacing.xs,
  },
  automationsList: {
    gap: spacing.sm,
  },
  automationCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  automationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  automationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  automationIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  automationName: {
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 2,
  },
  automationTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  automationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  automationBadge: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  automationBadgeText: {
    fontSize: 12,
    color: colors.primary,
  },
  automationTags: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  automationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  automationTagText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
});