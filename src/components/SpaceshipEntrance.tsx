import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";

interface SpaceshipEntranceProps {
  isActive: boolean;
  onComplete: () => void;
}

export const SpaceshipEntrance = ({ isActive, onComplete }: SpaceshipEntranceProps) => {
  const [stage, setStage] = useState<"entering" | "landed" | "complete">("entering");

  useEffect(() => {
    if (!isActive) return;

    // Spaceship enters
    const enterTimer = setTimeout(() => {
      setStage("landed");
    }, 2000);

    // Complete animation
    const completeTimer = setTimeout(() => {
      setStage("complete");
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  if (!isActive || stage === "complete") return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Spaceship */}
      <div
        className={`absolute transition-all duration-2000 ease-out ${
          stage === "entering"
            ? "top-[-200px] right-[20%] scale-50 rotate-45"
            : "top-[40%] right-[10%] scale-100 rotate-0"
        }`}
      >
        <div className="relative">
          {/* Spaceship body */}
          <div className="relative w-32 h-32">
            <Rocket className="w-full h-full text-primary animate-pulse" />
            
            {/* Engine glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary/30 blur-xl rounded-full animate-pulse" />
            
            {/* Particle trail */}
            {stage === "entering" && (
              <>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-20 bg-gradient-to-b from-primary to-transparent animate-pulse" />
                <div className="absolute top-[120%] left-1/2 -translate-x-1/2 w-1 h-16 bg-gradient-to-b from-primary/50 to-transparent animate-pulse delay-100" />
                <div className="absolute top-[140%] left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-b from-primary/30 to-transparent animate-pulse delay-200" />
              </>
            )}
          </div>

          {/* Landing thrusters */}
          {stage === "landed" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4">
              <div className="w-8 h-8 bg-accent rounded-full animate-ping" />
              <div className="w-8 h-8 bg-accent rounded-full animate-ping delay-100" />
            </div>
          )}

          {/* Draco text reveal */}
          {stage === "landed" && (
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="text-primary font-bold text-2xl animate-fade-in tracking-wider">
                DRACO ONLINE
              </div>
              <div className="text-accent text-sm animate-fade-in delay-300 text-center">
                Tactical Analysis Ready
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Atmospheric effects */}
      {stage === "entering" && (
        <>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-20 right-32 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-pulse delay-100" />
        </>
      )}

      {/* Landing shockwave */}
      {stage === "landed" && (
        <div className="absolute top-[40%] right-[10%] w-64 h-64 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping" />
          <div className="absolute inset-0 border-2 border-accent rounded-full animate-ping delay-100" />
        </div>
      )}
    </div>
  );
};
