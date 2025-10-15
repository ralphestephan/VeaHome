import { 
  ChevronLeft, User, Mail, Phone, MapPin, Calendar, Award, Zap, 
  Home as HomeIcon, Trophy, Star, TrendingUp, Clock, Shield, 
  Activity, Heart, Target, Flame, Wind, Lightbulb, Bell, Camera,
  Lock, Wifi, Speaker, Tv, Check, X, ChevronRight, Edit
} from "lucide-react";

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-xl bg-secondary p-2 transition-all hover:bg-secondary/80 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl">Profile</h2>
        </div>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95">
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </div>
        </button>
      </div>

      <div className="space-y-6 pb-20">
        {/* Profile Header */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 shadow-lg">
            <User className="h-12 w-12 text-white" />
          </div>
          <h3 className="mb-1 text-xl text-white">VeaLive Client</h3>
          <p className="text-sm text-white/70">Smart Home Owner • Premium</p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2">
              <div className="text-xs text-white/70">Member Since</div>
              <div className="text-sm text-white">Jan 2024</div>
            </div>
            <div className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2">
              <div className="text-xs text-white/70">Plan</div>
              <div className="text-sm text-white">Premium</div>
            </div>
            <div className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2">
              <div className="text-xs text-white/70">Level</div>
              <div className="text-sm text-white">Pro</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-primary/30 p-2">
                <HomeIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Devices</span>
            </div>
            <div className="text-2xl">38</div>
            <div className="mt-1 text-xs text-muted-foreground">+2 this week</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-primary/30 p-2">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Energy Saved</span>
            </div>
            <div className="text-2xl">156kWh</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="h-3 w-3" />
              <span>12% more</span>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-primary/30 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Automations</span>
            </div>
            <div className="text-2xl">12</div>
            <div className="mt-1 text-xs text-muted-foreground">Running daily</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-primary/30 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Scenes</span>
            </div>
            <div className="text-2xl">8</div>
            <div className="mt-1 text-xs text-muted-foreground">3 active</div>
          </div>
        </div>

        {/* Activity Overview */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Weekly Activity</h4>
            <button className="text-xs text-primary">View Details</button>
          </div>
          <div className="rounded-2xl bg-secondary p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-2xl">287</div>
                <div className="text-xs text-muted-foreground">Actions this week</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-green-500">
                <TrendingUp className="h-4 w-4" />
                <span>+23%</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-20">
              <div className="flex-1 rounded-t bg-primary/30 h-[40%]" />
              <div className="flex-1 rounded-t bg-primary/30 h-[60%]" />
              <div className="flex-1 rounded-t bg-primary/30 h-[45%]" />
              <div className="flex-1 rounded-t bg-primary h-[85%]" />
              <div className="flex-1 rounded-t bg-primary h-[70%]" />
              <div className="flex-1 rounded-t bg-primary/50 h-[50%]" />
              <div className="flex-1 rounded-t bg-primary/30 h-[30%]" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Contact Information</h4>
            <button className="text-xs text-primary">Update</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
              <div className="rounded-xl bg-muted p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm">client@vealive.com</div>
              </div>
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
              <div className="rounded-xl bg-muted p-2">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm">+1 234 567 8900</div>
              </div>
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
              <div className="rounded-xl bg-muted p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Address</div>
                <div className="text-sm">Smart Home, City</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Most Used Devices */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Most Used Devices</h4>
            <button className="text-xs text-primary">See All</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="rounded-xl bg-primary/20 p-2">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm">Living Room Lights</div>
                <div className="text-xs text-muted-foreground">Used 142 times</div>
              </div>
              <div className="text-sm text-primary">45%</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="rounded-xl bg-primary/20 p-2">
                <Wind className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm">Thermostat</div>
                <div className="text-xs text-muted-foreground">Used 98 times</div>
              </div>
              <div className="text-sm text-primary">32%</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="rounded-xl bg-primary/20 p-2">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm">Smart TV</div>
                <div className="text-xs text-muted-foreground">Used 76 times</div>
              </div>
              <div className="text-sm text-primary">23%</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Achievements</h4>
            <button className="text-xs text-primary">View All</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-4 text-center shadow-lg">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-white/90">Energy Saver</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-4 text-center shadow-lg">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Zap className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-white/90">Smart User</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-4 text-center shadow-lg">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Star className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-white/90">Premium</div>
            </div>
            <div className="rounded-2xl bg-secondary p-4 text-center border border-border">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Flame className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">30 Day Streak</div>
            </div>
            <div className="rounded-2xl bg-secondary p-4 text-center border border-border">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Shield className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Secured</div>
            </div>
            <div className="rounded-2xl bg-secondary p-4 text-center border border-border">
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Activity className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Active User</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Recent Activity</h4>
            <button className="text-xs text-primary">View All</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm">Turned off Living Room lights</div>
                    <div className="text-xs text-muted-foreground">2 minutes ago</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm">Adjusted thermostat to 23°C</div>
                    <div className="text-xs text-muted-foreground">15 minutes ago</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Activated Evening scene</div>
                    <div className="text-xs text-muted-foreground">1 hour ago</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Locked all doors</div>
                    <div className="text-xs text-muted-foreground">2 hours ago</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Checked security cameras</div>
                    <div className="text-xs text-muted-foreground">3 hours ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Quick Preferences</h4>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <Bell className="mb-2 h-5 w-5 text-primary" />
              <div className="text-sm">Notifications</div>
              <div className="text-xs text-muted-foreground">Manage alerts</div>
            </button>
            <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <Shield className="mb-2 h-5 w-5 text-primary" />
              <div className="text-sm">Privacy</div>
              <div className="text-xs text-muted-foreground">Security settings</div>
            </button>
            <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <Wifi className="mb-2 h-5 w-5 text-primary" />
              <div className="text-sm">Network</div>
              <div className="text-xs text-muted-foreground">Connection</div>
            </button>
            <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <Zap className="mb-2 h-5 w-5 text-primary" />
              <div className="text-sm">Energy</div>
              <div className="text-xs text-muted-foreground">Usage stats</div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full rounded-2xl bg-primary p-4 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(91,124,255,0.4)] active:scale-95">
            Edit Profile
          </button>
          <button className="w-full rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
            Privacy Settings
          </button>
          <button className="w-full rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
            Subscription Management
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
