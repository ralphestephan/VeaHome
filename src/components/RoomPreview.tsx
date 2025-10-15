import { useState } from "react";
import { FloorPlan } from "./FloorPlan";
import roomGif from "figma:asset/a4be53e82fc25644b6daf11c9ce10542a9783d99.png";
import { 
  Thermometer, Droplets, Wind, Zap, Lightbulb, Lock, Camera, Music, 
  Sunrise, Moon, Film, PartyPopper, Volume2, Wifi, Shield, Activity,
  Power, Clock, Eye, Bell, Radio, Tv, Speaker, Gauge, Flame, Snowflake,
  Sun, Cloud, Plug, Battery, WifiOff, ToggleLeft, ToggleRight, Settings2,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, Calendar
} from "lucide-react";

interface RoomPreviewProps {
  onSelectRoom: (room: string) => void;
  onNavigateToScenes?: () => void;
}

interface RoomData {
  image: string;
  scene: string;
  temperature: number;
  humidity: number;
  lights: number;
  devices: number;
  power: string;
}

export function RoomPreview({ onSelectRoom }: RoomPreviewProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>("salon");

  const roomData: Record<string, RoomData> = {
    salon: {
      image: "https://images.unsplash.com/photo-1668816143164-a439b3e687cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsaXZpbmclMjByb29tJTIwcHVycGxlfGVufDF8fHx8MTc2MDE3Nzk5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Evening Relax",
      temperature: 24,
      humidity: 62,
      lights: 6,
      devices: 12,
      power: "2.3kW"
    },
    master: {
      image: "https://images.unsplash.com/photo-1666841411771-5c115e702410?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiZWRyb29tJTIwcHVycGxlJTIwYmx1ZXxlbnwxfHx8fDE3NjAxNzc5OTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Sleep Mode",
      temperature: 22,
      humidity: 58,
      lights: 2,
      devices: 8,
      power: "0.8kW"
    },
    dudu: {
      image: "https://images.unsplash.com/photo-1666841411771-5c115e702410?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiZWRyb29tJTIwcHVycGxlJTIwYmx1ZXxlbnwxfHx8fDE3NjAxNzc5OTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Night Light",
      temperature: 21,
      humidity: 60,
      lights: 1,
      devices: 5,
      power: "0.4kW"
    },
    office: {
      image: "https://images.unsplash.com/photo-1616594004753-5d4cc030088c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwb2ZmaWNlJTIwYmx1ZSUyMHZpb2xldHxlbnwxfHx8fDE3NjAxNzc5OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Work Focus",
      temperature: 23,
      humidity: 55,
      lights: 2,
      devices: 9,
      power: "1.5kW"
    },
    kitchen: {
      image: "https://images.unsplash.com/photo-1652961222237-9e2bbca79504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwYmx1ZSUyMHB1cnBsZXxlbnwxfHx8fDE3NjAxNzc5OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Cooking",
      temperature: 23,
      humidity: 65,
      lights: 3,
      devices: 10,
      power: "3.2kW"
    },
    sitting: {
      image: "https://images.unsplash.com/photo-1668816143164-a439b3e687cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsaXZpbmclMjByb29tJTIwcHVycGxlfGVufDF8fHx8MTc2MDE3Nzk5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Reading",
      temperature: 23,
      humidity: 60,
      lights: 3,
      devices: 6,
      power: "0.9kW"
    },
    wc1: {
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Comfort",
      temperature: 20,
      humidity: 70,
      lights: 1,
      devices: 3,
      power: "0.3kW"
    },
    wc2: {
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Fresh",
      temperature: 20,
      humidity: 72,
      lights: 1,
      devices: 3,
      power: "0.2kW"
    },
    wc3: {
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Guest",
      temperature: 19,
      humidity: 68,
      lights: 1,
      devices: 2,
      power: "0.2kW"
    },
    balcony1: {
      image: "https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxjb255JTIwdGVycmFjZSUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Outdoor",
      temperature: 18,
      humidity: 75,
      lights: 1,
      devices: 2,
      power: "0.1kW"
    },
    balcony2: {
      image: "https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxjb255JTIwdGVycmFjZSUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
      scene: "Garden",
      temperature: 18,
      humidity: 78,
      lights: 1,
      devices: 2,
      power: "0.1kW"
    }
  };

  const currentRoomData = roomData[selectedRoom] || roomData.salon;

  const handleRoomSelect = (room: string) => {
    setSelectedRoom(room);
    onSelectRoom(room);
  };

  return (
    <div className="w-full space-y-6">
      {/* Floor Plan */}
      <FloorPlan onRoomSelect={handleRoomSelect} selectedRoom={selectedRoom} />
      
      {/* Room Details Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl capitalize">{selectedRoom || "Salon"}</h3>
          <p className="text-sm text-muted-foreground">Active Room • {currentRoomData.devices} Devices</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5">
            <Thermometer className="h-4 w-4 text-primary" />
            <span className="text-sm">{currentRoomData.temperature}°C</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5">
            <Droplets className="h-4 w-4 text-primary" />
            <span className="text-sm">{currentRoomData.humidity}%</span>
          </div>
        </div>
      </div>
      
      {/* Room Image Preview */}
      <div className="relative overflow-hidden rounded-3xl">
        <img
          src={roomGif}
          alt="Room Preview"
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-white/70">Current Scene</div>
              <h3 className="text-lg text-white">{currentRoomData.scene}</h3>
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm transition-all hover:scale-105 shadow-lg">
              Change
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1 text-xs text-white">
              <Lightbulb className="h-3 w-3" />
              <span>{currentRoomData.lights} lights on</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1 text-xs text-white">
              <Zap className="h-3 w-3" />
              <span>{currentRoomData.power}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Quick Actions</h4>
          <button className="text-xs text-primary">Customize</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <button 
            onClick={() => onSelectRoom(selectedRoom)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95"
          >
            <Lightbulb className="h-6 w-6 text-primary" />
            <span className="text-xs">All Lights</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Lock className="h-6 w-6 text-primary" />
            <span className="text-xs">Lock All</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-xs">Cameras</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Music className="h-6 w-6 text-primary" />
            <span className="text-xs">Music</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xs">Security</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Wifi className="h-6 w-6 text-primary" />
            <span className="text-xs">Network</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Volume2 className="h-6 w-6 text-primary" />
            <span className="text-xs">Audio</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-3 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95">
            <Settings2 className="h-6 w-6 text-primary" />
            <span className="text-xs">More</span>
          </button>
        </div>
      </div>
      
      {/* Device Control Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Room Controls</h4>
          <button 
            onClick={() => onSelectRoom(selectedRoom)}
            className="text-xs text-primary"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelectRoom(selectedRoom)}
            className="group relative overflow-hidden rounded-2xl bg-primary p-4 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(91,124,255,0.4)] active:scale-95"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="rounded-xl bg-white/20 p-2">
                <Thermometer className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl text-white">{currentRoomData.temperature}°C</span>
                <span className="text-xs text-white/70">Climate</span>
              </div>
            </div>
          </button>
          
          <button className="group rounded-2xl bg-secondary p-4 transition-all hover:scale-105 active:scale-95">
            <div className="flex flex-col items-start gap-2">
              <div className="rounded-xl bg-muted p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl">{currentRoomData.power}</span>
                <span className="text-xs text-muted-foreground">Power</span>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onSelectRoom(selectedRoom)}
            className="group rounded-2xl bg-primary p-4 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(91,124,255,0.4)] active:scale-95"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="rounded-xl bg-white/20 p-2">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl text-white">{currentRoomData.lights}</span>
                <span className="text-xs text-white/70">Lights On</span>
              </div>
            </div>
          </button>
          
          <button className="rounded-2xl bg-secondary p-4 transition-all hover:scale-105 active:scale-95">
            <div className="flex flex-col items-start gap-2">
              <div className="rounded-xl bg-muted p-2">
                <Wind className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl">{currentRoomData.humidity}%</span>
                <span className="text-xs text-muted-foreground">Humidity</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Smart Devices Status */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Connected Devices</h4>
          <button className="text-xs text-primary">Manage</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Tv className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">Smart TV</div>
            <div className="text-xs text-green-500">On</div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Speaker className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">Speaker</div>
            <div className="text-xs text-green-500">On</div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Camera className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Camera</div>
            <div className="text-xs text-muted">Off</div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Lock className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">Lock</div>
            <div className="text-xs text-green-500">Locked</div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Wifi className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">WiFi</div>
            <div className="text-xs text-green-500">Strong</div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Gauge className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">Sensor</div>
            <div className="text-xs text-green-500">Active</div>
          </div>
        </div>
      </div>
      
      {/* Scenes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Quick Scenes</h4>
          <button className="text-xs text-primary">View All</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-4 text-left transition-all hover:scale-105 active:scale-95 shadow-lg">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Sunrise className="h-6 w-6 text-white" />
            </div>
            <div className="text-sm text-white">Morning</div>
            <div className="text-xs text-white/70">6:00 AM • Auto</div>
          </button>
          <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:scale-105 active:scale-95">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Moon className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm">Night</div>
            <div className="text-xs text-muted-foreground">10:00 PM</div>
          </button>
          <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:scale-105 active:scale-95">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Film className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm">Movie</div>
            <div className="text-xs text-muted-foreground">Custom</div>
          </button>
          <button className="rounded-2xl bg-secondary p-4 text-left transition-all hover:scale-105 active:scale-95">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm">Party</div>
            <div className="text-xs text-muted-foreground">Custom</div>
          </button>
        </div>
      </div>

      {/* Climate Control */}
      <div>
        <h4 className="mb-3 text-sm text-muted-foreground">Climate Control</h4>
        <div className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary" />
              <span className="text-sm">Temperature</span>
            </div>
            <button className="rounded-lg bg-primary px-3 py-1 text-xs transition-all hover:scale-105">
              Auto
            </button>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <button className="rounded-xl bg-background p-3 transition-all hover:bg-background/80 active:scale-95">
              <Snowflake className="h-5 w-5 text-blue-400" />
            </button>
            <div className="text-center">
              <div className="text-3xl">{currentRoomData.temperature}°C</div>
              <div className="text-xs text-muted-foreground">Target: 23°C</div>
            </div>
            <button className="rounded-xl bg-background p-3 transition-all hover:bg-background/80 active:scale-95">
              <Flame className="h-5 w-5 text-orange-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/60 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Humidity</span>
              </div>
              <div className="text-lg">{currentRoomData.humidity}%</div>
            </div>
            <div className="rounded-xl bg-background/60 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Air Quality</span>
              </div>
              <div className="text-lg">Good</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Energy Stats */}
      <div className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Today's Energy</h4>
          <div className="flex items-center gap-1 text-xs text-green-500">
            <TrendingDown className="h-3 w-3" />
            <span>-12%</span>
          </div>
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
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Appliances</span>
              <span>28%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[28%] rounded-full bg-primary/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications & Alerts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Notifications</h4>
          <button className="text-xs text-primary">Clear All</button>
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
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="rounded-xl bg-orange-500/20 p-2">
              <Battery className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs">Smart lock battery low</div>
              <div className="text-xs text-muted-foreground">1 hour ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Tasks */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm text-muted-foreground">Upcoming Automations</h4>
          <button className="text-xs text-primary">Edit</button>
        </div>
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
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="rounded-xl bg-muted p-2">
              <Sunrise className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-xs">Wake Up</div>
              <div className="text-xs text-muted-foreground">6:30 AM Tomorrow</div>
            </div>
            <div className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
              Scheduled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}