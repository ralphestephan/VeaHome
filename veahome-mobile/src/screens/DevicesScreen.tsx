import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { mockDevices } from '../constants/mockData';
import Header from '../components/Header';
import DeviceTile from '../components/DeviceTile';

type Category = 'lights' | 'climate' | 'windows' | 'media' | 'security';

export default function DevicesScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('lights');

  const categories: { id: Category; label: string }[] = [
    { id: 'lights', label: 'Lights' },
    { id: 'climate', label: 'Climate' },
    { id: 'windows', label: 'Shutters' },
    { id: 'media', label: 'Media' },
    { id: 'security', label: 'Security' },
  ];

  const filterDevices = (category: Category) => {
    if (category === 'lights') return mockDevices.filter(d => d.type === 'light');
    if (category === 'climate') return mockDevices.filter(d => ['thermostat', 'ac'].includes(d.type));
    if (category === 'windows') return mockDevices.filter(d => ['blind', 'shutter'].includes(d.type));
    if (category === 'media') return mockDevices.filter(d => ['tv', 'speaker'].includes(d.type));
    if (category === 'security') return mockDevices.filter(d => ['camera', 'lock'].includes(d.type));
    return [];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>38 devices connected</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={require('../assets/4239477678dba8bff484942536b80f83ac9c74f8.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>All Devices</Text>
          <Text style={styles.heroSubtitle}>Control everything from one place</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.tab,
              activeCategory === category.id && styles.activeTab,
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === category.id && styles.activeTabText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Devices Grid */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.devicesGrid}>
          {filterDevices(activeCategory).map((device) => (
            <View key={device.id} style={styles.deviceItem}>
              <DeviceTile device={device} />
            </View>
          ))}
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
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  heroContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    height: 160,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(19, 21, 42, 0.7)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  deviceItem: {
    width: '47%',
  },
});