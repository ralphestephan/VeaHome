import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VictoryChart, VictoryArea, VictoryTheme, VictoryAxis } from 'victory-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { mockEnergyData } from '../constants/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'day' | 'week' | 'month';

export default function EnergyScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Energy Monitor</Text>
          <Text style={styles.subtitle}>Track your consumption</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialCommunityIcons name="download" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          <TouchableOpacity
            style={[styles.rangeButton, timeRange === 'day' && styles.activeRange]}
            onPress={() => setTimeRange('day')}
          >
            <Text style={[styles.rangeText, timeRange === 'day' && styles.activeRangeText]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeButton, timeRange === 'week' && styles.activeRange]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.rangeText, timeRange === 'week' && styles.activeRangeText]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeButton, timeRange === 'month' && styles.activeRange]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.rangeText, timeRange === 'month' && styles.activeRangeText]}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Usage Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <View>
              <Text style={styles.totalLabel}>Total Energy Usage</Text>
              <View style={styles.totalValueContainer}>
                <Text style={styles.totalValue}>24.5</Text>
                <Text style={styles.totalUnit}>kWh</Text>
              </View>
            </View>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lightning-bolt" size={32} color="white" />
            </View>
          </View>
          <View style={styles.trendBadge}>
            <MaterialCommunityIcons name="trending-down" size={14} color={colors.success} />
            <Text style={styles.trendText}>12% less than yesterday</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Energy Usage Today</Text>
          <VictoryChart
            theme={VictoryTheme.material}
            height={200}
            padding={{ left: 40, right: 20, top: 10, bottom: 30 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.muted },
                tickLabels: { fill: colors.mutedForeground, fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.muted },
                tickLabels: { fill: colors.mutedForeground, fontSize: 10 },
                grid: { stroke: colors.muted, strokeDasharray: '3,3' },
              }}
            />
            <VictoryArea
              data={mockEnergyData}
              x="time"
              y="total"
              style={{
                data: {
                  fill: colors.primary,
                  fillOpacity: 0.3,
                  stroke: colors.primary,
                  strokeWidth: 2,
                },
              }}
            />
          </VictoryChart>
        </View>

        {/* Category Cards */}
        <View style={styles.categoriesGrid}>
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons name="lightbulb" size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <MaterialCommunityIcons name="trending-down" size={12} color={colors.success} />
                <Text style={styles.trendPercent}>5%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>11.0</Text>
            <Text style={styles.categoryLabel}>Lighting • 45%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons name="air-conditioner" size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <MaterialCommunityIcons name="trending-down" size={12} color={colors.success} />
                <Text style={styles.trendPercent}>8%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>13.5</Text>
            <Text style={styles.categoryLabel}>Climate • 55%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons name="television" size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <MaterialCommunityIcons name="trending-up" size={12} color={colors.destructive} />
                <Text style={[styles.trendPercent, { color: colors.destructive }]}>3%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>6.8</Text>
            <Text style={styles.categoryLabel}>Media • 28%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons name="shield" size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <MaterialCommunityIcons name="trending-down" size={12} color={colors.success} />
                <Text style={styles.trendPercent}>2%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>2.2</Text>
            <Text style={styles.categoryLabel}>Security • 9%</Text>
          </View>
        </View>

        {/* Cost Estimate */}
        <View style={styles.costCard}>
          <View style={styles.costHeader}>
            <Text style={styles.costTitle}>Estimated Cost</Text>
            <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={styles.costValueContainer}>
            <Text style={styles.costValue}>$18.45</Text>
          </View>
          <Text style={styles.costLabel}>Today's electricity cost</Text>
          <View style={styles.costBreakdown}>
            <View style={styles.costItem}>
              <Text style={styles.costItemLabel}>This Week</Text>
              <Text style={styles.costItemValue}>$112.30</Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costItemLabel}>This Month</Text>
              <Text style={styles.costItemValue}>$456.80</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Insights</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <MaterialCommunityIcons name="trending-down" size={16} color={colors.success} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Great Job!</Text>
              <Text style={styles.insightText}>
                You've saved 12% more energy today
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: `${colors.info}20` }]}>
              <MaterialCommunityIcons name="information" size={16} color={colors.info} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Peak Hours Alert</Text>
              <Text style={styles.insightText}>
                Most energy used between 6-9 PM
              </Text>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
    marginBottom: spacing.lg,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  activeRange: {
    backgroundColor: colors.primary,
  },
  rangeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  activeRangeText: {
    color: 'white',
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
  },
  totalUnit: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 12,
    color: 'white',
  },
  chartCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendPercent: {
    fontSize: 10,
    color: colors.success,
  },
  categoryValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  costCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  costTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  costValueContainer: {
    marginBottom: spacing.xs,
  },
  costValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.foreground,
  },
  costLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  costBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  costItem: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  costItemLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  costItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12,
    color: colors.foreground,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});