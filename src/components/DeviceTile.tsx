import { LucideIcon } from "lucide-react";

interface DeviceTileProps {
  icon: LucideIcon;
  name: string;
  value?: string | number;
  unit?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DeviceTile({
  icon: Icon,
  name,
  value,
  unit,
  isActive = false,
  onClick,
  className = "",
}: DeviceTileProps) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-105 ${
        isActive
          ? "bg-primary shadow-[0_0_20px_rgba(91,124,255,0.4)]"
          : "bg-secondary"
      } ${className}`}
    >
      <div className="flex flex-col items-start gap-3">
        <div
          className={`rounded-xl p-2 ${
            isActive ? "bg-white/20" : "bg-muted"
          }`}
        >
          <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-primary"}`} />
        </div>
        <div className="flex flex-col items-start">
          {value !== undefined && (
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl ${isActive ? "text-white" : "text-foreground"}`}>
                {value}
              </span>
              {unit && (
                <span className={`text-sm ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                  {unit}
                </span>
              )}
            </div>
          )}
          <span className={`text-sm ${isActive ? "text-white/90" : "text-muted-foreground"}`}>
            {name}
          </span>
        </div>
      </div>
    </button>
  );
}
