import { Home } from "lucide-react";
import logoImage from "figma:asset/b2d7496ca08e3ec5a9cc24f37c8eb955ed80400e.png";

interface HomeScreenProps {
  onConnect: () => void;
}

export function HomeScreen({ onConnect }: HomeScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a0b1a] to-[#1a1047] p-6">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_40px_rgba(91,124,255,0.5)]">
        <Home className="h-12 w-12 text-white" />
      </div>
      
      <h1 className="mb-12 text-4xl">Connect Home</h1>
      
      <button
        onClick={onConnect}
        className="rounded-2xl bg-primary px-8 py-4 text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(91,124,255,0.6)]"
      >
        Get Started
      </button>
      
      <div className="mt-16">
        <img src={logoImage} alt="VeaLive 360" className="h-12 w-auto opacity-80" />
      </div>
    </div>
  );
}
