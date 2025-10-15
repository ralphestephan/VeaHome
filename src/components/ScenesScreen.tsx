import { useState } from "react";
import { 
  ChevronLeft, Plus, Play, Edit, Clock, Sunrise, Moon, Film, PartyPopper, 
  UserX, BedDouble, Briefcase, UtensilsCrossed, LucideIcon, Coffee,
  Book, Dumbbell, Baby, Music, Tv, Wind, Lightbulb, Shield, Home,
  Calendar, TrendingUp, Bell, CheckCircle, AlertCircle, Target, Zap
} from "lucide-react";

interface Scene {
  id: string;
  name: string;
  icon: LucideIcon;
  devices: number;
  isActive: boolean;
  time?: string;
  description?: string;
}

export function ScenesScreen() {
  const [scenes, setScenes] = useState<Scene[]>([
    { id: "1", name: "Morning Routine", icon: Sunrise, devices: 12, isActive: false, time: "6:00 AM", description: "Wake up gently" },
    { id: "2", name: "Evening Relax", icon: Moon, devices: 8, isActive: true, description: "Wind down" },
    { id: "3", name: "Movie Night", icon: Film, devices: 5, isActive: false, description: "Cinema mode" },
    { id: "4", name: "Party Mode", icon: PartyPopper, devices: 15, isActive: false, description: "Let's celebrate" },
    { id: "5", name: "Away from Home", icon: UserX, devices: 20, isActive: false, description: "Security active" },
    { id: "6", name: "Sleep Time", icon: BedDouble, devices: 10, isActive: false, time: "10:00 PM", description: "Good night" },
    { id: "7", name: "Work Focus", icon: Briefcase, devices: 6, isActive: false, description: "Productivity mode" },
    { id: "8", name: "Dinner Time", icon: UtensilsCrossed, devices: 7, isActive: false, time: "7:00 PM", description: "Perfect ambiance" },
    { id: "9", name: "Reading Mode", icon: Book, devices: 4, isActive: false, description: "Cozy lighting" },
    { id: "10", name: "Workout", icon: Dumbbell, devices: 5, isActive: false, description: "Energize" },
    { id: "11", name: "Baby Sleep", icon: Baby, devices: 3, isActive: false, description: "Quiet time" },
    { id: "12", name: "Coffee Break", icon: Coffee, devices: 4, isActive: false, description: "Relax & refresh" },
  ]);

  const toggleScene = (id: string) => {
    setScenes(scenes.map(scene => 
      scene.id === id 
        ? { ...scene, isActive: !scene.isActive }
        : { ...scene, isActive: false }
    ));
  };

  const activeScenes = scenes.filter(s => s.isActive);
  const inactiveScenes = scenes.filter(s => !s.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Scenes</h2>
          <p className="text-xs text-muted-foreground">
            {activeScenes.length} active • {inactiveScenes.length} available
          </p>
        </div>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create
          </div>
        </button>
      </div>

      <div className="space-y-6 pb-20">
        {/* Active Scene */}
        {activeScenes.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm text-muted-foreground">Active Now</h4>
            {activeScenes.map(scene => {
              const Icon = scene.icon;
              return (
                <div
                  key={scene.id}
                  className="rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-6 shadow-[0_0_30px_rgba(91,124,255,0.3)]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl text-white">{scene.name}</h3>
                        <p className="text-sm text-white/70">{scene.devices} devices active • {scene.description}</p>
                      </div>
                    </div>
                    <button className="rounded-xl bg-white/20 p-2 transition-all hover:bg-white/30 active:scale-95">
                      <Edit className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-white/90">
                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                      <Lightbulb className="mx-auto mb-1 h-4 w-4" />
                      <div>Lights: 50%</div>
                    </div>
                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                      <Wind className="mx-auto mb-1 h-4 w-4" />
                      <div>Temp: 23°C</div>
                    </div>
                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                      <Music className="mx-auto mb-1 h-4 w-4" />
                      <div>Music: On</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl">{scenes.length}</div>
            <div className="text-xs text-muted-foreground">Total Scenes</div>
          </div>
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl">{activeScenes.length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <div className="mb-2 flex justify-center">
              <div className="rounded-xl bg-primary/20 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl">3</div>
            <div className="text-xs text-muted-foreground">Scheduled</div>
          </div>
        </div>

        {/* Scene Categories */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Popular Scenes</h4>
          <div className="grid grid-cols-2 gap-3">
            {inactiveScenes.slice(0, 6).map((scene) => {
              const Icon = scene.icon;
              return (
                <button
                  key={scene.id}
                  onClick={() => toggleScene(scene.id)}
                  className="relative overflow-hidden rounded-2xl bg-secondary p-4 text-left transition-all hover:scale-105 hover:bg-secondary/80 active:scale-95"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm">{scene.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{scene.devices} devices</span>
                    {scene.time && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{scene.time}</span>
                        </div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Scenes */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">All Scenes</h4>
          <div className="space-y-2">
            {inactiveScenes.map((scene) => {
              const Icon = scene.icon;
              return (
                <button
                  key={scene.id}
                  onClick={() => toggleScene(scene.id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm">{scene.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {scene.devices} devices • {scene.description}
                    </div>
                  </div>
                  {scene.time && (
                    <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{scene.time}</span>
                    </div>
                  )}
                  <Play className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Automations */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Smart Automations</h4>
            <button className="text-xs text-primary">Manage All</button>
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-primary/20 p-2">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm">Good Morning Routine</div>
                    <div className="text-xs text-muted-foreground">Weekdays at 6:00 AM</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/20 px-2 py-1 text-xs text-primary">
                    Active
                  </div>
                  <div className="h-5 w-9 rounded-full bg-primary p-0.5">
                    <div className="h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>6 lights</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Wind className="h-3 w-3" />
                  <span>Heating</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Music className="h-3 w-3" />
                  <span>Music</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-muted p-2">
                    <Moon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm">Night Lights Off</div>
                    <div className="text-xs text-muted-foreground">Every day at 10:00 PM</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Off
                  </div>
                  <div className="h-5 w-9 rounded-full bg-muted p-0.5">
                    <div className="h-4 w-4 rounded-full bg-muted-foreground transition-transform" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>All lights</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Shield className="h-3 w-3" />
                  <span>Security</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-primary/20 p-2">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm">Welcome Home</div>
                    <div className="text-xs text-muted-foreground">When arriving home</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/20 px-2 py-1 text-xs text-primary">
                    Active
                  </div>
                  <div className="h-5 w-9 rounded-full bg-primary p-0.5">
                    <div className="h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>Entrance</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Wind className="h-3 w-3" />
                  <span>Climate</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <Music className="h-3 w-3" />
                  <span>Welcome</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-primary/20 p-2">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm">Energy Saving Mode</div>
                    <div className="text-xs text-muted-foreground">When no one is home</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/20 px-2 py-1 text-xs text-primary">
                    Active
                  </div>
                  <div className="h-5 w-9 rounded-full bg-primary p-0.5">
                    <div className="h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>-25% energy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scene Suggestions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Suggested for You</h4>
            <button className="text-xs text-primary">View All</button>
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-secondary p-4 border border-primary/30">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/30 p-2">
                  <Coffee className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm">Morning Coffee</div>
                  <div className="text-xs text-muted-foreground">Based on your routine</div>
                </div>
                <button className="rounded-lg bg-primary px-3 py-1 text-xs transition-all hover:scale-105 active:scale-95">
                  Add
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-secondary p-4 border border-primary/30">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/30 p-2">
                  <Tv className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm">TV Time</div>
                  <div className="text-xs text-muted-foreground">Perfect for evenings</div>
                </div>
                <button className="rounded-lg bg-primary px-3 py-1 text-xs transition-all hover:scale-105 active:scale-95">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scene Activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Recent Activity</h4>
            <button className="text-xs text-primary">History</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <div className="flex-1">
                <div className="text-xs">Evening Relax activated</div>
                <div className="text-xs text-muted-foreground">2 minutes ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="text-xs">Work Focus deactivated</div>
                <div className="text-xs text-muted-foreground">1 hour ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="text-xs">Morning Routine completed</div>
                <div className="text-xs text-muted-foreground">14 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}