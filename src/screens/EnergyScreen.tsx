import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
  Alert,
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
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
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
  const [exporting, setExporting] = useState(false);
  const { energyData, loading, refresh } = useEnergyData(homeId, timeRange);
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);

  // Real-time updates
  useRealtime({
    onEnergyUpdate: () => {
      refresh();
    },
  });

  useEffect(() => {
    if (homeId) refresh();
  }, [timeRange, homeId]);

  const safeEnergyData = Array.isArray(energyData) ? energyData : [];

  const handleExport = async () => {
    if (!safeEnergyData.length) {
      Alert.alert('No Data', 'There is no energy data to export for the selected range yet.');
      return;
    }

    try {
      setExporting(true);
      const headers = 'time,total,lighting,climate,media,security';
      const rows = safeEnergyData
        .map((entry) =>
          [
            entry.time,
            entry.total ?? 0,
            entry.lighting ?? 0,
            entry.climate ?? 0,
            entry.media ?? 0,
            entry.security ?? 0,
          ].join(',')
        )
        .join('\n');
      const csv = `${headers}\n${rows}`;

      await Share.share({
        title: `Energy report (${timeRange})`,
        message: csv,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to export energy data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Calculate totals from real data
  const totalEnergy = safeEnergyData.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalLighting = safeEnergyData.reduce((sum, e) => sum + (e.lighting || 0), 0);
  const totalClimate = safeEnergyData.reduce((sum, e) => sum + (e.climate || 0), 0);
  const totalMedia = safeEnergyData.reduce((sum, e) => sum + (e.media || 0), 0);
  const totalSecurity = safeEnergyData.reduce((sum, e) => sum + (e.security || 0), 0);

  const lightingPercent = totalEnergy > 0 ? Math.round((totalLighting / totalEnergy) * 100) : 0;
  const climatePercent = totalEnergy > 0 ? Math.round((totalClimate / totalEnergy) * 100) : 0;
  const mediaPercent = totalEnergy > 0 ? Math.round((totalMedia / totalEnergy) * 100) : 0;
  const securityPercent = totalEnergy > 0 ? Math.round((totalSecurity / totalEnergy) * 100) : 0;

  return (
    <View style={styles.container}>
      <Header title="Energy" />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Track your consumption</Text>
        <TouchableOpacity
          style={[
            styles.iconButton,
            (exporting || !safeEnergyData.length) && styles.iconButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={exporting || !safeEnergyData.length}
        >
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
          {safeEnergyData.length > 0 ? (
            <LineChart
              data={{
                labels: safeEnergyData.slice(-7).map((_, i) => {
                  if (timeRange === 'day') return `${i * 4}h`;
                  if (timeRange === 'week') return `Day ${i + 1}`;
                  return `Week ${i + 1}`;
                }),
                datasets: [
                  {
                    data: safeEnergyData.slice(-7).map(e => e.total || 0),
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
            <Text style={styles.categoryLabel}>Utility • {mediaPercent}%</Text>
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

        {/* Cost Estimate - Hidden until we have billing integration */}
        {false && (
        <View style={styles.costCard}>
          <View style={styles.costHeader}>
            <Text style={styles.costTitle}>Estimated Cost</Text>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.costValueContainer}>
            <Text style={styles.costValue}>Coming Soon</Text>
          </View>
          <Text style={styles.costLabel}>Billing integration pending</Text>
        </View>
        )}

        {/* Insights - Hidden until we implement analytics */}
        {false && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Insights</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <TrendingDown size={16} color={colors.success} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Analytics Coming Soon!</Text>
              <Text style={styles.insightText}>
                Energy insights and recommendations will appear here
              </Text>
            </View>
          </View>
        </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
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
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: fontSize.sm,
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
    iconButtonDisabled: {
      opacity: 0.5,
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
      fontSize: fontSize.sm,
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
      ...shadows.neonPrimary,
    },
    totalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    totalLabel: {
      fontSize: fontSize.sm,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    totalValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    totalValue: {
      fontSize: fontSize.display,
      fontWeight: '700',
      color: 'white',
    },
    totalUnit: {
      fontSize: fontSize.lg,
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
      fontSize: fontSize.sm,
      color: 'white',
    },
    chartCard: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    chartTitle: {
      fontSize: fontSize.sm,
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
      fontSize: fontSize.sm,
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
      borderColor: colors.border,
      ...shadows.md,
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
      fontSize: fontSize.xs,
      color: colors.success,
    },
    categoryValue: {
      fontSize: fontSize.xxl,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    categoryLabel: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    costCard: {
      backgroundColor: colors.secondary,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    costHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    costTitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    costValueContainer: {
      marginBottom: spacing.xs,
    },
    costValue: {
      fontSize: fontSize.xxxl,
      fontWeight: '700',
      color: colors.foreground,
    },
    costLabel: {
      fontSize: fontSize.sm,
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
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    costItemValue: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.foreground,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
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
      borderWidth: 1,
      borderColor: colors.border,
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
      fontSize: fontSize.sm,
      color: colors.foreground,
      marginBottom: 2,
    },
    insightText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      color: colors.mutedForeground,
      fontSize: fontSize.sm,
    },
  });