import { Zap, TrendingDown, TrendingUp, Calendar, Download, AlertCircle, Lightbulb, Wind, Tv, Shield } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function EnergyScreen() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");

  // Time series data for different ranges
  const timeSeriesData = {
    day: [
      { time: "12 AM", total: 2.1, lighting: 0.8, climate: 1.0, media: 0.2, security: 0.1 },
      { time: "3 AM", total: 1.8, lighting: 0.5, climate: 1.0, media: 0.2, security: 0.1 },
      { time: "6 AM", total: 3.2, lighting: 1.2, climate: 1.5, media: 0.4, security: 0.1 },
      { time: "9 AM", total: 2.8, lighting: 1.0, climate: 1.3, media: 0.4, security: 0.1 },
      { time: "12 PM", total: 2.5, lighting: 0.9, climate: 1.2, media: 0.3, security: 0.1 },
      { time: "3 PM", total: 2.9, lighting: 1.1, climate: 1.4, media: 0.3, security: 0.1 },
      { time: "6 PM", total: 4.2, lighting: 1.8, climate: 1.8, media: 0.5, security: 0.1 },
      { time: "9 PM", total: 3.8, lighting: 1.6, climate: 1.6, media: 0.5, security: 0.1 },
    ],
    week: [
      { time: "Mon", total: 22.5, lighting: 9.8, climate: 10.2, media: 1.9, security: 0.6 },
      { time: "Tue", total: 24.8, lighting: 11.2, climate: 11.5, media: 1.5, security: 0.6 },
      { time: "Wed", total: 21.2, lighting: 9.2, climate: 10.0, media: 1.4, security: 0.6 },
      { time: "Thu", total: 26.5, lighting: 12.0, climate: 12.5, media: 1.4, security: 0.6 },
      { time: "Fri", total: 28.0, lighting: 12.8, climate: 13.0, media: 1.6, security: 0.6 },
      { time: "Sat", total: 24.0, lighting: 10.5, climate: 11.0, media: 2.0, security: 0.5 },
      { time: "Sun", total: 21.5, lighting: 9.3, climate: 10.0, media: 1.7, security: 0.5 },
    ],
    month: [
      { time: "Week 1", total: 158, lighting: 71, climate: 73, media: 10, security: 4 },
      { time: "Week 2", total: 162, lighting: 73, climate: 75, media: 10, security: 4 },
      { time: "Week 3", total: 155, lighting: 70, climate: 71, media: 10, security: 4 },
      { time: "Week 4", total: 172, lighting: 77, climate: 80, media: 11, security: 4 },
      { time: "Week 5", total: 165, lighting: 74, climate: 76, media: 11, security: 4 },
    ]
  };

  // Summary data for different time ranges
  const energyData = {
    day: {
      total: 24.5,
      trend: -12,
      lighting: { value: 11.0, percentage: 45, trend: -5 },
      climate: { value: 13.5, percentage: 55, trend: -8 },
      media: { value: 6.8, percentage: 28, trend: 3 },
      security: { value: 2.2, percentage: 9, trend: -2 },
      costToday: 18.45,
      costWeek: 112.30,
      costMonth: 456.80,
    },
    week: {
      total: 168.5,
      trend: -8,
      lighting: { value: 75.8, percentage: 45, trend: -6 },
      climate: { value: 92.7, percentage: 55, trend: -10 },
      media: { value: 47.6, percentage: 28, trend: 5 },
      security: { value: 15.2, percentage: 9, trend: -3 },
      costToday: 18.45,
      costWeek: 126.95,
      costMonth: 456.80,
    },
    month: {
      total: 680.0,
      trend: -15,
      lighting: { value: 306.0, percentage: 45, trend: -12 },
      climate: { value: 374.0, percentage: 55, trend: -18 },
      media: { value: 190.4, percentage: 28, trend: 8 },
      security: { value: 61.2, percentage: 9, trend: -5 },
      costToday: 18.45,
      costWeek: 112.30,
      costMonth: 512.00,
    }
  };

  const currentData = energyData[timeRange];
  const currentTimeSeries = timeSeriesData[timeRange];

  const handleExport = () => {
    // Create CSV data
    const csvContent = `VeaHome Energy Report - ${timeRange.toUpperCase()}\n\nTotal Energy: ${currentData.total} kWh\nTrend: ${currentData.trend}%\n\nCategory Breakdown:\nLighting: ${currentData.lighting.value} kWh (${currentData.lighting.percentage}%)\nClimate Control: ${currentData.climate.value} kWh (${currentData.climate.percentage}%)\nMedia & Entertainment: ${currentData.media.value} kWh (${currentData.media.percentage}%)\nSecurity: ${currentData.security.value} kWh (${currentData.security.percentage}%)\n\nEstimated Cost:\nToday: $${currentData.costToday}\nThis Week: $${currentData.costWeek}\nThis Month: $${currentData.costMonth}`;

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veahome-energy-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Energy Monitor</h2>
          <p className="text-xs text-muted-foreground">Track your consumption</p>
        </div>
        <button 
          onClick={handleExport}
          className="rounded-xl bg-secondary p-2 transition-all hover:bg-secondary/80 active:scale-95"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-1">
        <button
          onClick={() => setTimeRange("day")}
          className={`rounded-xl py-2 text-sm text-center transition-all ${
            timeRange === "day" ? "bg-primary text-white" : "text-muted-foreground"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimeRange("week")}
          className={`rounded-xl py-2 text-sm text-center transition-all ${
            timeRange === "week" ? "bg-primary text-white" : "text-muted-foreground"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimeRange("month")}
          className={`rounded-xl py-2 text-sm text-center transition-all ${
            timeRange === "month" ? "bg-primary text-white" : "text-muted-foreground"
          }`}
        >
          This Month
        </button>
      </div>

      {/* Current Usage */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">Total Energy Usage</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl text-white">{currentData.total}</span>
              <span className="mb-2 text-xl text-white/70">kWh</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/20 p-4">
            <Zap className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 text-sm text-white">
            <TrendingDown className="h-4 w-4" />
            <span>{Math.abs(currentData.trend)}% less than {timeRange === 'day' ? 'yesterday' : timeRange === 'week' ? 'last week' : 'last month'}</span>
          </div>
        </div>
      </div>

      {/* Time Series Chart - Area Chart */}
      <div className="rounded-3xl bg-secondary p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">
            {timeRange === 'day' ? 'Energy Usage Today' : timeRange === 'week' ? 'Energy Usage This Week' : 'Energy Usage This Month'}
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={currentTimeSeries}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5b7cff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#5b7cff" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91, 124, 255, 0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
            />
            <YAxis 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
              label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#8891b3' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e2139', 
                border: '1px solid rgba(91, 124, 255, 0.3)',
                borderRadius: '12px',
                color: '#ffffff'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#5b7cff" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked Bar Chart - Category Breakdown */}
      <div className="rounded-3xl bg-secondary p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Category Breakdown</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={currentTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91, 124, 255, 0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
            />
            <YAxis 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
              label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#8891b3' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e2139', 
                border: '1px solid rgba(91, 124, 255, 0.3)',
                borderRadius: '12px',
                color: '#ffffff'
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#8891b3', fontSize: '12px' }}
            />
            <Bar dataKey="lighting" stackId="a" fill="#5b7cff" radius={[0, 0, 0, 0]} />
            <Bar dataKey="climate" stackId="a" fill="#7c8fff" radius={[0, 0, 0, 0]} />
            <Bar dataKey="media" stackId="a" fill="#9ba8ff" radius={[0, 0, 0, 0]} />
            <Bar dataKey="security" stackId="a" fill="#bac4ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart - Trend Comparison */}
      <div className="rounded-3xl bg-secondary p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Usage Trends</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={currentTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91, 124, 255, 0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
            />
            <YAxis 
              stroke="#8891b3" 
              tick={{ fill: '#8891b3', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e2139', 
                border: '1px solid rgba(91, 124, 255, 0.3)',
                borderRadius: '12px',
                color: '#ffffff'
              }}
            />
            <Legend wrapperStyle={{ color: '#8891b3', fontSize: '12px' }} />
            <Line type="monotone" dataKey="lighting" stroke="#5b7cff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="climate" stroke="#7c8fff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="media" stroke="#9ba8ff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${currentData.lighting.trend < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {currentData.lighting.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{Math.abs(currentData.lighting.trend)}%</span>
            </div>
          </div>
          <div className="text-2xl">{currentData.lighting.value}</div>
          <div className="text-xs text-muted-foreground">Lighting • {currentData.lighting.percentage}%</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Wind className="h-5 w-5 text-primary" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${currentData.climate.trend < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {currentData.climate.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{Math.abs(currentData.climate.trend)}%</span>
            </div>
          </div>
          <div className="text-2xl">{currentData.climate.value}</div>
          <div className="text-xs text-muted-foreground">Climate • {currentData.climate.percentage}%</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Tv className="h-5 w-5 text-primary" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${currentData.media.trend < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {currentData.media.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{Math.abs(currentData.media.trend)}%</span>
            </div>
          </div>
          <div className="text-2xl">{currentData.media.value}</div>
          <div className="text-xs text-muted-foreground">Media • {currentData.media.percentage}%</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${currentData.security.trend < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {currentData.security.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              <span>{Math.abs(currentData.security.trend)}%</span>
            </div>
          </div>
          <div className="text-2xl">{currentData.security.value}</div>
          <div className="text-xs text-muted-foreground">Security • {currentData.security.percentage}%</div>
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Estimated Cost</h3>
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="mb-2 flex items-end gap-2">
          <span className="text-4xl">${currentData.costToday}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {timeRange === 'day' ? "Today's electricity cost" : 
           timeRange === 'week' ? "This week's electricity cost" :
           "This month's electricity cost"}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">This Week</div>
            <div className="text-lg">${currentData.costWeek}</div>
          </div>
          <div className="rounded-xl bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">This Month</div>
            <div className="text-lg">${currentData.costMonth}</div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="mb-3 text-sm text-muted-foreground">Energy Insights</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <div className="rounded-xl bg-green-500/20 p-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm">Great Job!</div>
              <div className="text-xs text-muted-foreground">
                You've saved {Math.abs(currentData.trend)}% more energy this {timeRange === 'day' ? 'day' : timeRange === 'week' ? 'week' : 'month'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <div className="rounded-xl bg-blue-500/20 p-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm">Peak Hours Alert</div>
              <div className="text-xs text-muted-foreground">
                Most energy used between 6-9 PM. Consider shifting usage to save costs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
