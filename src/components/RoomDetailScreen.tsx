import { useState } from "react";
import { ChevronLeft, Lightbulb, Thermometer, Wind, Tv, Speaker, Camera, Lock, Power, Settings2, Plus, TrendingDown } from "lucide-react";
import { DeviceTile } from "./DeviceTile";
import roomGif from "figma:asset/a4be53e82fc25644b6daf11c9ce10542a9783d99.png";

interface RoomDetailScreenProps {
  room: string;
  onBack: () => void;
  onSelectThermostat: () => void;
}

interface RoomDevices {
  [key: string]: {
    name: string;
    lights: Array<{ name: string; isActive: boolean }>;
    climate: Array<{ name: string; value: number; isActive: boolean }>;
    media: Array<{ name: string; isActive: boolean }>;
    security: Array<{ name: string; isActive: boolean }>;
    stats: {
      temperature: number;
      humidity: number;
      power: string;
      devices: number;
    };
  };
}

export function RoomDetailScreen({ room, onBack, onSelectThermostat }: RoomDetailScreenProps) {
  const roomDevices: RoomDevices = {
    salon: {
      name: "Salon",
      lights: [
        { name: "Main Lights", isActive: true },
        { name: "Accent Lights", isActive: true },
        { name: "Floor Lamp", isActive: false },
        { name: "Table Lamp", isActive: true },
      ],
      climate: [
        { name: "Thermostat", value: 24, isActive: true },
        { name: "Ceiling Fan", value: 2, isActive: true },
      ],
      media: [
        { name: "Smart TV", isActive: true },
        { name: "Soundbar", isActive: true },
        { name: "Streaming Box", isActive: true },
      ],
      security: [
        { name: "Camera", isActive: true },
        { name: "Motion Sensor", isActive: true },
      ],
      stats: { temperature: 24, humidity: 62, power: "2.3kW", devices: 11 }
    },
    master: {
      name: "Master Bedroom",
      lights: [
        { name: "Ceiling Light", isActive: false },
        { name: "Bedside Lamps", isActive: true },
      ],
      climate: [
        { name: "AC Unit", value: 22, isActive: true },
      ],
      media: [
        { name: "TV", isActive: false },
        { name: "Speaker", isActive: false },
      ],
      security: [
        { name: "Smart Lock", isActive: true },
      ],
      stats: { temperature: 22, humidity: 58, power: "0.8kW", devices: 6 }
    },
    dudu: {
      name: "Dudu's Room",
      lights: [
        { name: "Main Light", isActive: false },
        { name: "Night Light", isActive: true },
      ],
      climate: [
        { name: "AC", value: 21, isActive: true },
      ],
      media: [
        { name: "Smart Speaker", isActive: false },
      ],
      security: [
        { name: "Baby Monitor", isActive: true },
      ],
      stats: { temperature: 21, humidity: 60, power: "0.4kW", devices: 5 }
    },
    office: {
      name: "Office",
      lights: [
        { name: "Desk Lamp", isActive: true },
        { name: "Ceiling Light", isActive: true },
      ],
      climate: [
        { name: "Thermostat", value: 23, isActive: true },
      ],
      media: [
        { name: "Monitor Lights", isActive: true },
      ],
      security: [
        { name: "Camera", isActive: true },
      ],
      stats: { temperature: 23, humidity: 55, power: "1.5kW", devices: 5 }
    },
    kitchen: {
      name: "Kitchen",
      lights: [
        { name: "Main Lights", isActive: true },
        { name: "Under Cabinet", isActive: true },
        { name: "Island Lights", isActive: true },
      ],
      climate: [
        { name: "Ventilation", value: 3, isActive: true },
      ],
      media: [
        { name: "Smart Display", isActive: true },
      ],
      security: [],
      stats: { temperature: 23, humidity: 65, power: "3.2kW", devices: 5 }
    },
    sitting: {
      name: "Sitting Room",
      lights: [
        { name: "Main Lights", isActive: true },
        { name: "Reading Lamp", isActive: true },
      ],
      climate: [
        { name: "Thermostat", value: 23, isActive: true },
      ],
      media: [
        { name: "Speaker", isActive: false },
      ],
      security: [],
      stats: { temperature: 23, humidity: 60, power: "0.9kW", devices: 4 }
    },
    wc1: {
      name: "Bathroom 1",
      lights: [
        { name: "Main Light", isActive: false },
        { name: "Mirror Light", isActive: true },
      ],
      climate: [
        { name: "Ventilation", value: 2, isActive: true },
      ],
      media: [],
      security: [],
      stats: { temperature: 20, humidity: 70, power: "0.3kW", devices: 3 }
    },
    wc2: {
      name: "Bathroom 2",
      lights: [
        { name: "Main Light", isActive: false },
      ],
      climate: [
        { name: "Ventilation", value: 1, isActive: false },
      ],
      media: [],
      security: [],
      stats: { temperature: 20, humidity: 72, power: "0.2kW", devices: 2 }
    },
    wc3: {
      name: "Guest Bathroom",
      lights: [
        { name: "Main Light", isActive: false },
      ],
      climate: [
        { name: "Ventilation", value: 1, isActive: false },
      ],
      media: [],
      security: [],
      stats: { temperature: 19, humidity: 68, power: "0.2kW", devices: 2 }
    },
    balcony1: {
      name: "Balcony",
      lights: [
        { name: "Outdoor Light", isActive: false },
      ],
      climate: [],
      media: [],
      security: [
        { name: "Camera", isActive: true },
      ],
      stats: { temperature: 18, humidity: 75, power: "0.1kW", devices: 2 }
    },
    balcony2: {
      name: "Garden Balcony",
      lights: [
        { name: "String Lights", isActive: false },
      ],
      climate: [],
      media: [],
      security: [],
      stats: { temperature: 18, humidity: 78, power: "0.1kW", devices: 1 }
    },
    entrance: {
      name: "Entrance",
      lights: [
        { name: "Main Light", isActive: true },
      ],
      climate: [],
      media: [],
      security: [
        { name: "Smart Lock", isActive: true },
        { name: "Doorbell Camera", isActive: true },
      ],
      stats: { temperature: 21, humidity: 60, power: "0.2kW", devices: 3 }
    },
    maid: {
      name: "Maid's Room",
      lights: [
        { name: "Main Light", isActive: false },
      ],
      climate: [
        { name: "AC", value: 21, isActive: false },
      ],
      media: [],
      security: [],
      stats: { temperature: 21, humidity: 62, power: "0.3kW", devices: 2 }
    },
  };

  const currentRoom = roomDevices[room] || roomDevices.salon;
  const [lights, setLights] = useState(currentRoom.lights);
  const [climate, setClimate] = useState(currentRoom.climate);
  const [media, setMedia] = useState(currentRoom.media);
  const [security, setSecurity] = useState(currentRoom.security);

  const toggleLight = (index: number) => {
    const newLights = [...lights];
    newLights[index].isActive = !newLights[index].isActive;
    setLights(newLights);
  };

  const toggleClimate = (index: number) => {
    const newClimate = [...climate];
    newClimate[index].isActive = !newClimate[index].isActive;
    setClimate(newClimate);
  };

  const toggleMedia = (index: number) => {
    const newMedia = [...media];
    newMedia[index].isActive = !newMedia[index].isActive;
    setMedia(newMedia);
  };

  const toggleSecurity = (index: number) => {
    const newSecurity = [...security];
    newSecurity[index].isActive = !newSecurity[index].isActive;
    setSecurity(newSecurity);
  };

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
            <div>
              <h2 className="text-2xl">{currentRoom.name}</h2>
              <p className="text-xs text-muted-foreground">{currentRoom.stats.devices} devices connected</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-secondary p-2 transition-all hover:bg-secondary/80 active:scale-95">
              <Settings2 className="h-5 w-5" />
            </button>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add
              </div>
            </button>
          </div>
        </div>

        {/* Room Image */}
        <div className="mb-6 relative overflow-hidden rounded-3xl">
          <img
            src={roomGif}
            alt={currentRoom.name}
            className="h-56 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg text-white">{currentRoom.name}</h3>
                <div className="flex gap-3 mt-2">
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1 text-xs text-white">
                    <Thermometer className="h-3 w-3" />
                    <span>{currentRoom.stats.temperature}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1 text-xs text-white">
                    <Power className="h-3 w-3" />
                    <span>{currentRoom.stats.power}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Room Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Temp</span>
            </div>
            <div className="text-2xl">{currentRoom.stats.temperature}°C</div>
          </div>
          <div className="rounded-2xl bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <Wind className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Humidity</span>
            </div>
            <div className="text-2xl">{currentRoom.stats.humidity}%</div>
          </div>
          <div className="rounded-2xl bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <Power className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Power</span>
            </div>
            <div className="text-lg">{currentRoom.stats.power}</div>
          </div>
        </div>

        {/* Lights */}
        {lights.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm text-muted-foreground">Lighting</h3>
            <div className="grid grid-cols-2 gap-3">
              {lights.map((light, index) => (
                <DeviceTile
                  key={index}
                  icon={Lightbulb}
                  name={light.name}
                  isActive={light.isActive}
                  onClick={() => toggleLight(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Climate */}
        {climate.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm text-muted-foreground">Climate Control</h3>
            <div className="grid grid-cols-2 gap-3">
              {climate.map((device, index) => (
                device.name === "Thermostat" ? (
                  <button
                    key={index}
                    onClick={onSelectThermostat}
                    className="relative overflow-hidden rounded-2xl bg-primary p-4 shadow-[0_0_20px_rgba(91,124,255,0.4)] transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="flex flex-col items-start gap-3">
                      <div className="rounded-xl bg-white/20 p-2">
                        <Thermometer className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl text-white">{device.value}</span>
                          <span className="text-sm text-white/70">°C</span>
                        </div>
                        <span className="text-sm text-white/90">{device.name}</span>
                      </div>
                    </div>
                  </button>
                ) : (
                  <DeviceTile
                    key={index}
                    icon={Wind}
                    name={device.name}
                    value={device.value}
                    isActive={device.isActive}
                    onClick={() => toggleClimate(index)}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* Media */}
        {media.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm text-muted-foreground">Media & Entertainment</h3>
            <div className="grid grid-cols-2 gap-3">
              {media.map((device, index) => (
                <DeviceTile
                  key={index}
                  icon={device.name.includes("TV") ? Tv : Speaker}
                  name={device.name}
                  isActive={device.isActive}
                  onClick={() => toggleMedia(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Security */}
        {security.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm text-muted-foreground">Security</h3>
            <div className="grid grid-cols-2 gap-3">
              {security.map((device, index) => (
                <DeviceTile
                  key={index}
                  icon={device.name.includes("Camera") ? Camera : Lock}
                  name={device.name}
                  isActive={device.isActive}
                  onClick={() => toggleSecurity(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Energy Usage */}
        <div className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Energy Usage Today</h4>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingDown className="h-3 w-3" />
              <span>-8%</span>
            </div>
          </div>
          <div className="mb-4 flex items-end gap-2">
            <span className="text-4xl">{currentRoom.stats.power}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full w-[65%] rounded-full bg-primary" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">65% of daily average</div>
        </div>
      </div>
    </div>
  );
}
