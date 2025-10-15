import { useState } from "react";
import { 
  Thermometer, Zap, Lightbulb, Wind, Camera, Lock, 
  TrendingDown, TrendingUp, AlertCircle, CheckCircle,
  Home, Activity, Clock, Calendar, Settings2
} from "lucide-react";

interface DashboardScreenProps {
  onNavigate: (screen: string, room?: string) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-6 shadow-lg">
        <div className="mb-2 text-sm text-white/70">Welcome back</div>
        <h2 className="mb-1 text-2xl text-white">Good Evening</h2>
        <p className="text-sm text-white/80">Everything is running smoothly</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("energy")}
          className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-95"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingDown className="h-3 w-3" />
              <span>-12%</span>
            </div>
          </div>
          <div className="text-2xl">24.5 kWh</div>
          <div className="text-xs text-muted-foreground">Energy Today</div>
        </button>

        <button
          onClick={() => onNavigate("devices")}
          className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-95"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle className="h-3 w-3" />
            </div>
          </div>
          <div className="text-2xl">38</div>
          <div className="text-xs text-muted-foreground">Active Devices</div>
        </button>

        <div className="rounded-2xl bg-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Thermometer className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-2xl">23°C</div>
          <div className="text-xs text-muted-foreground">Avg Temperature</div>
        </div>

        <div className="rounded-2xl bg-secondary p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded-xl bg-primary/20 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-2xl">287</div>
          <div className="text-xs text-muted-foreground">Actions Today</div>
        </div>
      </div>

      {/* Active Devices */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Active Devices</h3>
          <button 
            onClick={() => onNavigate("devices")}
            className="text-xs text-primary"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-white/20 p-2">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                On
              </div>
            </div>
            <div className="text-sm text-white">Living Room</div>
            <div className="text-xs text-white/70">6 lights active</div>
          </div>

          <div className="rounded-2xl bg-secondary p-4 border border-border">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-muted p-2">
                <Wind className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Auto
              </div>
            </div>
            <div className="text-sm">Climate</div>
            <div className="text-xs text-muted-foreground">23°C target</div>
          </div>

          <div className="rounded-2xl bg-secondary p-4 border border-border">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-muted p-2">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                Active
              </div>
            </div>
            <div className="text-sm">Security</div>
            <div className="text-xs text-muted-foreground">3 cameras</div>
          </div>

          <div className="rounded-2xl bg-secondary p-4 border border-border">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-muted p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                Locked
              </div>
            </div>
            <div className="text-sm">Doors</div>
            <div className="text-xs text-muted-foreground">All secured</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm text-muted-foreground">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate("scenes")}
            className="rounded-2xl bg-secondary p-4 text-center transition-all hover:bg-secondary/80 active:scale-95"
          >
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-xs">Evening Scene</div>
          </button>
          <button className="rounded-2xl bg-secondary p-4 text-center transition-all hover:bg-secondary/80 active:scale-95">
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-xs">All Lights</div>
          </button>
          <button className="rounded-2xl bg-secondary p-4 text-center transition-all hover:bg-secondary/80 active:scale-95">
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-xs">Lock All</div>
          </button>
        </div>
      </div>

      {/* Energy Overview */}
      <div className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Today's Energy</h3>
          <button 
            onClick={() => onNavigate("energy")}
            className="text-xs text-primary"
          >
            Details
          </button>
        </div>
        <div className="mb-4 flex items-end gap-2">
          <span className="text-4xl">24.5</span>
          <span className="mb-1 text-xl text-muted-foreground">kWh</span>
        </div>
        <div className="space-y-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Lights</span>
              <span>45%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[45%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Climate</span>
              <span>55%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[55%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm text-muted-foreground">Notifications</h3>
          <button className="text-xs text-primary">View All</button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="rounded-xl bg-green-500/20 p-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs">All systems operational</div>
              <div className="text-xs text-muted-foreground">2 min ago</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="rounded-xl bg-blue-500/20 p-2">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs">Evening scene activated</div>
              <div className="text-xs text-muted-foreground">15 min ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Automations */}
      <div>
        <h3 className="mb-3 text-sm text-muted-foreground">Scheduled</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="rounded-xl bg-primary/20 p-2">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs">Night Mode</div>
              <div className="text-xs text-muted-foreground">10:00 PM</div>
            </div>
            <div className="rounded-lg bg-primary/20 px-2 py-1 text-xs text-primary">
              Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
