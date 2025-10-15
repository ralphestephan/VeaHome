import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { RoomPreview } from "./components/RoomPreview";
import { RoomDetailScreen } from "./components/RoomDetailScreen";
import { DevicesScreen } from "./components/DevicesScreen";
import { ThermostatScreen } from "./components/ThermostatScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { ScenesScreen } from "./components/ScenesScreen";
import { EnergyScreen } from "./components/EnergyScreen";
import { Settings, User, Wand2, Zap, LayoutGrid, Home } from "lucide-react";
import logoImage from "figma:asset/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png";

type Screen = "home" | "dashboard" | "room" | "devices" | "thermostat" | "settings" | "profile" | "scenes" | "energy";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedRoom, setSelectedRoom] = useState<string>("salon");

  if (currentScreen === "home") {
    return <HomeScreen onConnect={() => setCurrentScreen("dashboard")} />;
  }

  if (currentScreen === "thermostat") {
    return <ThermostatScreen onBack={() => setCurrentScreen("room")} />;
  }

  if (currentScreen === "room") {
    return (
      <RoomDetailScreen
        room={selectedRoom}
        onBack={() => setCurrentScreen("dashboard")}
        onSelectThermostat={() => setCurrentScreen("thermostat")}
      />
    );
  }

  if (currentScreen === "profile") {
    return <ProfileScreen onBack={() => setCurrentScreen("dashboard")} />;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-border/50 bg-background/80 p-6 backdrop-blur-lg">
        <img src={logoImage} alt="VeaLive 360" className="h-14 w-auto" />
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentScreen("profile")}
            className="rounded-xl bg-secondary p-2 transition-all hover:bg-secondary/80 hover:scale-105 active:scale-95"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {currentScreen === "dashboard" && (
          <>
            <div className="mb-6">
              <h2 className="mb-1 text-2xl">VeaHome</h2>
              <p className="text-sm text-muted-foreground">Smart Home Control</p>
            </div>
            <RoomPreview onSelectRoom={(room) => {
              setSelectedRoom(room);
              setCurrentScreen("room");
            }} />
          </>
        )}

        {currentScreen === "devices" && (
          <DevicesScreen
            onSelectThermostat={() => setCurrentScreen("thermostat")}
          />
        )}

        {currentScreen === "energy" && (
          <EnergyScreen />
        )}

        {currentScreen === "scenes" && (
          <ScenesScreen />
        )}

        {currentScreen === "settings" && (
          <SettingsScreen />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-around p-3">
          <button
            onClick={() => setCurrentScreen("dashboard")}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/50 active:scale-95 ${
              currentScreen === "dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setCurrentScreen("devices")}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/50 active:scale-95 ${
              currentScreen === "devices" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-xs">Devices</span>
          </button>
          <button
            onClick={() => setCurrentScreen("energy")}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/50 active:scale-95 ${
              currentScreen === "energy" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs">Energy</span>
          </button>
          <button
            onClick={() => setCurrentScreen("scenes")}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/50 active:scale-95 ${
              currentScreen === "scenes" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wand2 className="h-5 w-5" />
            <span className="text-xs">Scenes</span>
          </button>
          <button
            onClick={() => setCurrentScreen("settings")}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/50 active:scale-95 ${
              currentScreen === "settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
