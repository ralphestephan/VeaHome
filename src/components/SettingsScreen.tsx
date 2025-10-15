import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Shield, 
  Wifi, 
  Moon, 
  Globe, 
  User, 
  Home,
  Smartphone,
  Zap,
  HelpCircle,
  Database,
  Cloud,
  Lock,
  Eye,
  Volume2,
  Vibrate,
  Monitor,
  Battery,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileText,
  Info,
  Award,
  MessageSquare,
  Mail,
  Phone
} from "lucide-react";
import { Switch } from "./ui/switch";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [energySaving, setEnergySaving] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Settings</h2>
          <p className="text-xs text-muted-foreground">Manage your preferences</p>
        </div>
      </div>

      <div className="space-y-6 pb-20">
        {/* Profile Section */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-white">VeaLive Client</h3>
              <p className="text-sm text-white/70">Premium Account</p>
            </div>
            <button className="rounded-xl bg-white/20 p-2 text-white transition-all hover:bg-white/30 active:scale-95">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Home Settings */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Home Settings</h4>
          <div className="space-y-2">
            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Home Information</div>
                  <div className="text-xs text-muted-foreground">VeaHome Smart</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Network & Connection</div>
                  <div className="text-xs text-muted-foreground">Connected • 120 Mbps</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Devices & Integrations</div>
                  <div className="text-xs text-muted-foreground">38 devices connected</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Rooms & Zones</div>
                  <div className="text-xs text-muted-foreground">15 rooms configured</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Preferences</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">All Notifications</div>
                  <div className="text-xs text-muted-foreground">Push & Email alerts</div>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Push Notifications</div>
                  <div className="text-xs text-muted-foreground">Device alerts</div>
                </div>
              </div>
              <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Email Notifications</div>
                  <div className="text-xs text-muted-foreground">Weekly reports</div>
                </div>
              </div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Dark Mode</div>
                  <div className="text-xs text-muted-foreground">Always on</div>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Sound Effects</div>
                  <div className="text-xs text-muted-foreground">UI sounds</div>
                </div>
              </div>
              <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Vibrate className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Vibration</div>
                  <div className="text-xs text-muted-foreground">Haptic feedback</div>
                </div>
              </div>
              <Switch checked={vibration} onCheckedChange={setVibration} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Energy Saving</div>
                  <div className="text-xs text-muted-foreground">Auto optimize power</div>
                </div>
              </div>
              <Switch checked={energySaving} onCheckedChange={setEnergySaving} />
            </div>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Language & Region</div>
                  <div className="text-xs text-muted-foreground">English (US)</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Data & Storage */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Data & Storage</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Cloud Sync</div>
                  <div className="text-xs text-muted-foreground">Auto sync enabled</div>
                </div>
              </div>
              <Switch checked={cloudSync} onCheckedChange={setCloudSync} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Auto Backup</div>
                  <div className="text-xs text-muted-foreground">Daily at 3:00 AM</div>
                </div>
              </div>
              <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
            </div>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Download Data</div>
                  <div className="text-xs text-muted-foreground">Export your data</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Import Settings</div>
                  <div className="text-xs text-muted-foreground">Restore from backup</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Security & Privacy */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Security & Privacy</h4>
          <div className="space-y-2">
            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Security Settings</div>
                  <div className="text-xs text-muted-foreground">PIN & Biometric auth</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Change Password</div>
                  <div className="text-xs text-muted-foreground">Update your password</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Privacy Policy</div>
                  <div className="text-xs text-muted-foreground">View our policies</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Auto Mode</div>
                  <div className="text-xs text-muted-foreground">AI-powered automation</div>
                </div>
              </div>
              <Switch checked={autoMode} onCheckedChange={setAutoMode} />
            </div>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Terms of Service</div>
                  <div className="text-xs text-muted-foreground">Read our terms</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Support & Help</h4>
          <div className="space-y-2">
            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Help Center</div>
                  <div className="text-xs text-muted-foreground">FAQ & Guides</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Contact Support</div>
                  <div className="text-xs text-muted-foreground">Get help from our team</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Emergency Contact</div>
                  <div className="text-xs text-muted-foreground">24/7 support hotline</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Send Feedback</div>
                  <div className="text-xs text-muted-foreground">Help us improve</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* System */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">System</h4>
          <div className="space-y-2">
            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Check for Updates</div>
                  <div className="text-xs text-muted-foreground">Version 1.0.0</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Battery className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Battery Usage</div>
                  <div className="text-xs text-muted-foreground">View power consumption</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm">About VeaHome</div>
                  <div className="text-xs text-muted-foreground">App information</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between rounded-2xl bg-destructive/20 p-4 transition-all hover:bg-destructive/30 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-destructive/30 p-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-destructive">Clear Cache</div>
                  <div className="text-xs text-destructive/70">Free up space</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-destructive" />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl bg-secondary p-4 text-center">
          <p className="text-sm text-muted-foreground">VeaHome by VeaLive</p>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="mt-2 text-xs text-muted-foreground">© 2025 VeaLive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}