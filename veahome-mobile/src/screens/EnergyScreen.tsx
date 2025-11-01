import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Download, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Lightbulb, 
  Fan, 
  Tv, 
  Shield, 
  Calendar, 
  Info 
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useEnergyData } from '../hooks/useEnergyData';
import { useRealtime } from '../hooks/useRealtime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'day' | 'week' | 'month';

export default function EnergyScreen() {
  const { user } = useAuth();
  const homeId = user?.homeId;
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const { energyData, loading, refresh } = useEnergyData(homeId, timeRange);

  // Real-time updates
  useRealtime({
    onEnergyUpdate: () => {
      refresh();
    },
  });

  useEffect(() => {
    if (homeId) refresh();
  }, [timeRange, homeId]);

  // Calculate totals from real data
  const totalEnergy = energyData.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalLighting = energyData.reduce((sum, e) => sum + (e.lighting || 0), 0);
  const totalClimate = energyData.reduce((sum, e) => sum + (e.climate || 0), 0);
  const totalMedia = energyData.reduce((sum, e) => sum + (e.media || 0), 0);
  const totalSecurity = energyData.reduce((sum, e) => sum + (e.security || 0), 0);

  const lightingPercent = totalEnergy > 0 ? Math.round((totalLighting / totalEnergy) * 100) : 0;
  const climatePercent = totalEnergy > 0 ? Math.round((totalClimate / totalEnergy) * 100) : 0;
  const mediaPercent = totalEnergy > 0 ? Math.round((totalMedia / totalEnergy) * 100) : 0;
  const securityPercent = totalEnergy > 0 ? Math.round((totalSecurity / totalEnergy) * 100) : 0;

  return (
    <View style={styles.container}>
      <Header title="Energy" />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Track your consumption</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Download size={20} color={colors.foreground} />
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

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading energy data...</Text>
          </View>
        )}

        {/* Total Usage Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <View>
              <Text style={styles.totalLabel}>Total Energy Usage</Text>
              <View style={styles.totalValueContainer}>
                <Text style={styles.totalValue}>{totalEnergy.toFixed(1)}</Text>
                <Text style={styles.totalUnit}>kWh</Text>
              </View>
            </View>
            <View style={styles.iconCircle}>
              <Zap size={32} color="white" />
            </View>
          </View>
          <View style={styles.trendBadge}>
            <TrendingDown size={14} color={colors.success} />
            <Text style={styles.trendText}>Track your consumption</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Energy Usage {timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'}</Text>
          {energyData.length > 0 ? (
            <LineChart
              data={{
                labels: energyData.slice(-7).map((_, i) => {
                  if (timeRange === 'day') return `${i * 4}h`;
                  if (timeRange === 'week') return `Day ${i + 1}`;
                  return `Week ${i + 1}`;
                }),
                datasets: [
                  {
                    data: energyData.slice(-7).map(e => e.total || 0),
                    color: (opacity = 1) => colors.primary,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={SCREEN_WIDTH - 96}
              height={200}
              chartConfig={{
                backgroundColor: colors.secondary,
                backgroundGradientFrom: colors.secondary,
                backgroundGradientTo: colors.secondary,
                decimalPlaces: 1,
                color: (opacity = 1) => colors.primary,
                labelColor: (opacity = 1) => colors.mutedForeground,
                style: {
                  borderRadius: borderRadius.lg,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: colors.primary,
                },
              }}
              bezier
              style={{
                marginVertical: spacing.md,
                borderRadius: borderRadius.lg,
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <BarChart3 size={48} color={colors.primary} />
              <Text style={styles.chartPlaceholderText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Category Cards */}
        <View style={styles.categoriesGrid}>
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <Lightbulb size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <TrendingDown size={12} color={colors.success} />
                <Text style={styles.trendPercent}>5%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>{totalLighting.toFixed(1)}</Text>
            <Text style={styles.categoryLabel}>Lighting • {lightingPercent}%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <Fan size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <TrendingDown size={12} color={colors.success} />
                <Text style={styles.trendPercent}>8%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>{totalClimate.toFixed(1)}</Text>
            <Text style={styles.categoryLabel}>Climate • {climatePercent}%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <Tv size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <TrendingUp size={12} color={colors.destructive} />
                <Text style={[styles.trendPercent, { color: colors.destructive }]}>3%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>{totalMedia.toFixed(1)}</Text>
            <Text style={styles.categoryLabel}>Media • {mediaPercent}%</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <Shield size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <TrendingDown size={12} color={colors.success} />
                <Text style={styles.trendPercent}>2%</Text>
              </View>
            </View>
            <Text style={styles.categoryValue}>{totalSecurity.toFixed(1)}</Text>
            <Text style={styles.categoryLabel}>Security • {securityPercent}%</Text>
          </View>
        </View>

        {/* Cost Estimate */}
        <View style={styles.costCard}>
          <View style={styles.costHeader}>
            <Text style={styles.costTitle}>Estimated Cost</Text>
            <Calendar size={20} color={colors.primary} />
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
              <TrendingDown size={16} color={colors.success} />
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
              <Info size={16} color={colors.info} />
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
    </View>
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
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: colors.mutedForeground,
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
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
});