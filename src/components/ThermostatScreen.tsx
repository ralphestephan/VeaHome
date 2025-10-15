import { useState } from "react";
import { ChevronLeft, Power, Wind, Calendar, Sun, Moon, Droplets, Zap } from "lucide-react";
import { ThermostatDial } from "./ThermostatDial";

interface ThermostatScreenProps {
  onBack: () => void;
}

export function ThermostatScreen({ onBack }: ThermostatScreenProps) {
  const [temperature, setTemperature] = useState(23);
  const [mode, setMode] = useState<"heat" | "cool" | "auto">("auto");
  const [isOn, setIsOn] = useState(true);
  const [fanSpeed, setFanSpeed] = useState(2);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-xl bg-secondary p-2 transition-all hover:bg-secondary/80"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <h3 className="text-lg">Climate Control</h3>
          <p className="text-sm text-muted-foreground">Living Room</p>
        </div>
        <div className="flex flex-col items-end text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Sun className="h-3 w-3" />
            <span>21°C</span>
          </div>
          <div className="flex items-center gap-1">
            <Moon className="h-3 w-3" />
            <span>7°C</span>
          </div>
        </div>
      </div>

      {/* Environment Stats */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary p-3 text-center">
          <Droplets className="mx-auto mb-1 h-4 w-4 text-primary" />
          <div className="text-sm">65%</div>
          <div className="text-xs text-muted-foreground">Humidity</div>
        </div>
        <div className="rounded-xl bg-secondary p-3 text-center">
          <Wind className="mx-auto mb-1 h-4 w-4 text-primary" />
          <div className="text-sm">Good</div>
          <div className="text-xs text-muted-foreground">Air Quality</div>
        </div>
        <div className="rounded-xl bg-secondary p-3 text-center">
          <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
          <div className="text-sm">240W</div>
          <div className="text-xs text-muted-foreground">Power</div>
        </div>
      </div>

      {/* Thermostat Dial */}
      <div className="mb-8 flex justify-center">
        <ThermostatDial
          temperature={temperature}
          onTemperatureChange={setTemperature}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4 pb-6">
        {/* Mode Buttons */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Mode</h4>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                setIsOn(!isOn);
                setMode("auto");
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                !isOn ? "bg-secondary" : "bg-secondary/50"
              }`}
            >
              <div className="rounded-xl bg-muted p-2">
                <Power className="h-4 w-4 text-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Off</span>
            </button>

            <button
              onClick={() => {
                setMode("cool");
                setIsOn(true);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                mode === "cool" && isOn
                  ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
                  : "bg-secondary/50"
              }`}
            >
              <div className={`rounded-xl p-2 ${mode === "cool" && isOn ? "bg-white/20" : "bg-muted"}`}>
                <svg
                  className={`h-4 w-4 ${mode === "cool" && isOn ? "text-white" : "text-foreground"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"
                  />
                </svg>
              </div>
              <span className={`text-xs ${mode === "cool" && isOn ? "text-white" : "text-muted-foreground"}`}>
                Cool
              </span>
            </button>

            <button
              onClick={() => {
                setMode("heat");
                setIsOn(true);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                mode === "heat" && isOn
                  ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
                  : "bg-secondary/50"
              }`}
            >
              <div className={`rounded-xl p-2 ${mode === "heat" && isOn ? "bg-white/20" : "bg-muted"}`}>
                <Sun className={`h-4 w-4 ${mode === "heat" && isOn ? "text-white" : "text-foreground"}`} />
              </div>
              <span className={`text-xs ${mode === "heat" && isOn ? "text-white" : "text-muted-foreground"}`}>
                Heat
              </span>
            </button>

            <button
              onClick={() => {
                setMode("auto");
                setIsOn(true);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                mode === "auto" && isOn
                  ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
                  : "bg-secondary/50"
              }`}
            >
              <div className={`rounded-xl p-2 ${mode === "auto" && isOn ? "bg-white/20" : "bg-muted"}`}>
                <Wind className={`h-4 w-4 ${mode === "auto" && isOn ? "text-white" : "text-foreground"}`} />
              </div>
              <span className={`text-xs ${mode === "auto" && isOn ? "text-white" : "text-muted-foreground"}`}>
                Auto
              </span>
            </button>
          </div>
        </div>

        {/* Fan Speed */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Fan Speed</h4>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((speed) => (
              <button
                key={speed}
                onClick={() => setFanSpeed(speed)}
                className={`rounded-2xl p-3 text-center transition-all ${
                  fanSpeed === speed
                    ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
                    : "bg-secondary"
                }`}
              >
                <div className={`text-sm ${fanSpeed === speed ? "text-white" : "text-foreground"}`}>
                  {speed === 1 ? "Low" : speed === 2 ? "Medium" : "High"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h4 className="mb-3 text-sm text-muted-foreground">Schedule</h4>
          <button
            onClick={() => {
              setMode("schedule");
              setIsOn(true);
            }}
            className={`flex w-full items-center justify-between rounded-2xl p-4 transition-all ${
              mode === "schedule" && isOn
                ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
                : "bg-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${mode === "schedule" && isOn ? "bg-white/20" : "bg-muted"}`}>
                <Calendar className={`h-5 w-5 ${mode === "schedule" && isOn ? "text-white" : "text-foreground"}`} />
              </div>
              <div className="text-left">
                <div className={`text-sm ${mode === "schedule" && isOn ? "text-white" : "text-foreground"}`}>
                  Auto Schedule
                </div>
                <div className={`text-xs ${mode === "schedule" && isOn ? "text-white/70" : "text-muted-foreground"}`}>
                  Smart optimization
                </div>
              </div>
            </div>
            <div className={`text-xs ${mode === "schedule" && isOn ? "text-white/90" : "text-muted-foreground"}`}>
              {mode === "schedule" && isOn ? "Active" : "Inactive"}
            </div>
          </button>
        </div>

        {/* Energy Saving */}
        <div className="rounded-2xl bg-gradient-to-br from-secondary to-muted p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm">Energy Usage</span>
            </div>
            <span className="text-sm text-primary">-12%</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Compared to last week. Keep it up!
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}