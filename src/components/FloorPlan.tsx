import { useState } from "react";
import { motion } from "motion/react";
import { 
  Bed, 
  Monitor, 
  Sofa, 
  Flower2, 
  UtensilsCrossed, 
  Bath, 
  ArrowUpDown, 
  DoorOpen, 
  CloudSun,
  Lightbulb,
  Thermometer
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface FloorPlanProps {
  onRoomSelect: (room: string) => void;
  selectedRoom?: string;
}

interface Room {
  id: string;
  name: string;
  path: string;
  color: string;
  icon: LucideIcon;
  temperature: number;
  lights: number;
  image?: string;
}

export function FloorPlan({ onRoomSelect, selectedRoom }: FloorPlanProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Recreating the exact floor plan from the image
  const rooms: Room[] = [
    { 
      id: "master", 
      name: "Master", 
      path: "M 180 20 L 320 20 L 320 120 L 180 120 Z",
      color: "#FFA07A",
      icon: Bed,
      temperature: 22,
      lights: 2,
      image: "https://images.unsplash.com/photo-1666841411771-5c115e702410?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiZWRyb29tJTIwcHVycGxlJTIwYmx1ZXxlbnwxfHx8fDE3NjAxNzc5OTF8MA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "dudu", 
      name: "Dudu", 
      path: "M 180 120 L 320 120 L 320 200 L 180 200 Z",
      color: "#FFB6A0",
      icon: Bed,
      temperature: 21,
      lights: 1,
      image: "https://images.unsplash.com/photo-1666841411771-5c115e702410?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiZWRyb29tJTIwcHVycGxlJTIwYmx1ZXxlbnwxfHx8fDE3NjAxNzc5OTF8MA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "office", 
      name: "Office", 
      path: "M 180 200 L 320 200 L 320 280 L 180 280 Z",
      color: "#FFCB8F",
      icon: Monitor,
      temperature: 23,
      lights: 2,
      image: "https://images.unsplash.com/photo-1616594004753-5d4cc030088c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwb2ZmaWNlJTIwYmx1ZSUyMHZpb2xldHxlbnwxfHx8fDE3NjAxNzc5OTJ8MA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "wc1", 
      name: "WC", 
      path: "M 60 120 L 120 120 L 120 200 L 60 200 Z",
      color: "#87CEEB",
      icon: Bath,
      temperature: 20,
      lights: 1,
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "wc2", 
      name: "WC", 
      path: "M 60 200 L 120 200 L 120 280 L 60 280 Z",
      color: "#87CEEB",
      icon: Bath,
      temperature: 20,
      lights: 1,
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "sitting", 
      name: "Sitting", 
      path: "M 120 280 L 180 280 L 180 380 L 120 380 Z",
      color: "#B8A9D8",
      icon: Sofa,
      temperature: 23,
      lights: 3,
      image: "https://images.unsplash.com/photo-1668816143164-a439b3e687cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsaXZpbmclMjByb29tJTIwcHVycGxlfGVufDF8fHx8MTc2MDE3Nzk5M3ww&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "salon", 
      name: "Salon", 
      path: "M 180 280 L 380 280 L 380 420 L 180 420 Z",
      color: "#C4B5F5",
      icon: Sofa,
      temperature: 24,
      lights: 6,
      image: "https://images.unsplash.com/photo-1668816143164-a439b3e687cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsaXZpbmclMjByb29tJTIwcHVycGxlfGVufDF8fHx8MTc2MDE3Nzk5M3ww&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "plant", 
      name: "Plant", 
      path: "M 340 380 L 440 380 L 440 480 L 340 480 Z",
      color: "#FFB6D4",
      icon: Flower2,
      temperature: 22,
      lights: 1,
    },
    { 
      id: "balcony1", 
      name: "Bal.", 
      path: "M 320 20 L 420 20 L 420 120 L 320 120 Z",
      color: "#FFD4A3",
      icon: CloudSun,
      temperature: 18,
      lights: 1,
      image: "https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxjb255JTIwdGVycmFjZSUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkzfDA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "wc3", 
      name: "WC", 
      path: "M 120 380 L 180 380 L 180 440 L 120 440 Z",
      color: "#87CEEB",
      icon: Bath,
      temperature: 20,
      lights: 1,
      image: "https://images.unsplash.com/photo-1723386384578-29f725c16cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHZpb2xldCUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkyfDA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "entrance", 
      name: "Ent.", 
      path: "M 120 440 L 180 440 L 180 500 L 120 500 Z",
      color: "#D4D4D4",
      icon: DoorOpen,
      temperature: 21,
      lights: 1,
    },
    { 
      id: "lift", 
      name: "Lift", 
      path: "M 60 380 L 120 380 L 120 460 L 60 460 Z",
      color: "#B0B0B0",
      icon: ArrowUpDown,
      temperature: 20,
      lights: 1,
    },
    { 
      id: "maid", 
      name: "Maid", 
      path: "M 20 460 L 80 460 L 80 520 L 20 520 Z",
      color: "#B8E6CF",
      icon: Bed,
      temperature: 21,
      lights: 1,
    },
    { 
      id: "kitchen", 
      name: "Ktc.", 
      path: "M 80 460 L 180 460 L 180 520 L 80 520 Z",
      color: "#A8E6CF",
      icon: UtensilsCrossed,
      temperature: 23,
      lights: 3,
      image: "https://images.unsplash.com/photo-1652961222237-9e2bbca79504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwYmx1ZSUyMHB1cnBsZXxlbnwxfHx8fDE3NjAxNzc5OTJ8MA&ixlib=rb-4.1.0&q=80&w=400"
    },
    { 
      id: "balcony2", 
      name: "Bal.", 
      path: "M 180 460 L 280 460 L 280 520 L 180 520 Z",
      color: "#C8E6CF",
      icon: CloudSun,
      temperature: 18,
      lights: 1,
      image: "https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxjb255JTIwdGVycmFjZSUyMGJsdWV8ZW58MXx8fHwxNzYwMTc3OTkzfDA&ixlib=rb-4.1.0&q=80&w=400"
    },
  ];

  const activeRoom = hoveredRoom || selectedRoom;
  const activeRoomData = rooms.find(r => r.id === activeRoom);

  return (
    <div className="w-full max-w-full overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-muted to-secondary p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg">Interactive Floor Plan</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Click rooms to control</span>
        </div>
      </div>
      
      <div className="relative mx-auto aspect-square max-w-md">
        <svg
          viewBox="0 0 460 540"
          className="h-full w-full drop-shadow-xl"
        >
          {/* Background */}
          <rect x="0" y="0" width="460" height="540" fill="#13152a" rx="20" />
          
          {/* Main outer walls */}
          <path
            d="M 20 20 L 440 20 L 440 480 L 340 480 L 340 520 L 20 520 Z"
            fill="none"
            stroke="#2a2d4a"
            strokeWidth="6"
          />
          
          {/* Interior walls - creating the floor plan structure */}
          {/* Vertical walls */}
          <path d="M 60 380 L 60 520" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 80 460 L 80 520" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 120 120 L 120 500" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 180 20 L 180 520" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 280 460 L 280 520" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 320 20 L 320 120" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 340 380 L 340 480" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 380 280 L 380 420" stroke="#2a2d4a" strokeWidth="3" />
          
          {/* Horizontal walls */}
          <path d="M 60 120 L 320 120" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 60 200 L 320 200" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 60 280 L 380 280" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 60 380 L 440 380" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 120 440 L 180 440" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 20 460 L 340 460" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 180 420 L 380 420" stroke="#2a2d4a" strokeWidth="3" />
          <path d="M 340 480 L 440 480" stroke="#2a2d4a" strokeWidth="3" />
          
          {/* Rooms */}
          {rooms.map((room) => (
            <g key={room.id}>
              <motion.path
                d={room.path}
                fill={room.color}
                opacity={
                  activeRoom === room.id
                    ? 0.9
                    : 0.6
                }
                stroke={
                  selectedRoom === room.id
                    ? "#5b7cff"
                    : activeRoom === room.id
                    ? "#7c8cff"
                    : "#2a2d4a"
                }
                strokeWidth={selectedRoom === room.id ? 3 : 2}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onClick={() => onRoomSelect(room.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              />
            </g>
          ))}
          
          {/* Room labels and icons */}
          {rooms.map((room) => {
            const bounds = room.path.match(/\d+/g)?.map(Number) || [];
            const x = (bounds[0] + bounds[2]) / 2;
            const y = (bounds[1] + bounds[3]) / 2;
            const Icon = room.icon;
            
            return (
              <g key={`label-${room.id}`} className="pointer-events-none">
                <foreignObject
                  x={x - 12}
                  y={y - 20}
                  width="24"
                  height="24"
                  opacity={activeRoom === room.id ? 1 : 0.8}
                >
                  <div className="flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                </foreignObject>
                <text
                  x={x}
                  y={y + 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight={activeRoom === room.id ? "600" : "400"}
                  className="select-none"
                  opacity={activeRoom === room.id ? 1 : 0.7}
                >
                  {room.name}
                </text>
              </g>
            );
          })}\n        </svg>
      </div>
      
      {/* Room Info Panel */}
      {activeRoomData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/30">
              <activeRoomData.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm">{activeRoomData.name}</h4>
              <p className="text-xs text-muted-foreground">
                {activeRoomData.id === "wc1" || activeRoomData.id === "wc2" || activeRoomData.id === "wc3" 
                  ? "Bathroom" 
                  : activeRoomData.id.includes("balcony") 
                  ? "Balcony" 
                  : activeRoomData.id === "entrance"
                  ? "Entrance"
                  : activeRoomData.id === "lift"
                  ? "Elevator"
                  : "Living Space"}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-background/40 p-2">
              <Thermometer className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Temp</div>
                <div className="text-sm">{activeRoomData.temperature}°C</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-background/40 p-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Lights</div>
                <div className="text-sm">{activeRoomData.lights} on</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2 rounded-xl bg-background/50 p-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: '#5b7cff' }} />
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-background/50 p-2">
          <div className="h-3 w-3 rounded bg-primary/30" />
          <span className="text-muted-foreground">Hover</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-background/50 p-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground">Active</span>
        </div>
      </div>
    </div>
  );
}
