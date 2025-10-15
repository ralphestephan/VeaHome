import { useState, useEffect, useRef } from "react";
import { Snowflake, Plus, Minus } from "lucide-react";

interface ThermostatDialProps {
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  min?: number;
  max?: number;
}

export function ThermostatDial({
  temperature,
  onTemperatureChange,
  min = 16,
  max = 30,
}: ThermostatDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startTempRef = useRef<number>(temperature);

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startTempRef.current = temperature;
  };

  const handleMove = (clientY: number) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - clientY;
    const sensitivity = 0.5;
    const change = Math.round(deltaY * sensitivity);
    
    const newTemp = Math.max(min, Math.min(max, startTempRef.current + change));
    if (newTemp !== temperature) {
      onTemperatureChange(newTemp);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleEnd);
      
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging]);

  const percentage = ((temperature - min) / (max - min)) * 100;
  const strokeDasharray = 2 * Math.PI * 90;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  const increaseTemp = () => {
    if (temperature < max) {
      onTemperatureChange(temperature + 1);
    }
  };

  const decreaseTemp = () => {
    if (temperature > min) {
      onTemperatureChange(temperature - 1);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        <svg
          id="thermostat-dial"
          width="280"
          height="280"
          viewBox="0 0 200 200"
          className="cursor-pointer select-none"
          onMouseDown={(e) => handleStart(e.clientY)}
          onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(91, 124, 255, 0.1)"
            strokeWidth="8"
          />
          
          {/* Progress circle with glow */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{
              filter: "drop-shadow(0 0 10px rgba(91, 124, 255, 0.8))",
            }}
          />
          
          {/* Inner circle */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="rgba(30, 33, 57, 0.5)"
            stroke="rgba(91, 124, 255, 0.2)"
            strokeWidth="1"
          />
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b7cff" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Temperature display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="mb-2 rounded-full bg-primary/20 p-2">
            <Snowflake className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-baseline">
            <span className="text-6xl tracking-tight">{temperature}</span>
            <span className="ml-1 text-2xl text-muted-foreground">°C</span>
          </div>
        </div>
      </div>
      
      {/* Temperature control buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={decreaseTemp}
          disabled={temperature <= min}
          className="rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-xs text-muted-foreground">Target</span>
          <span className="text-lg">{temperature}°C</span>
        </div>
        <button
          onClick={increaseTemp}
          disabled={temperature >= max}
          className="rounded-2xl bg-secondary p-4 transition-all hover:bg-secondary/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
