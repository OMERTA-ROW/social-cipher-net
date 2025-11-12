import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface ZozoSpaceshipEntranceProps {
  isActive: boolean;
  onComplete: () => void;
}

export const ZozoSpaceshipEntrance = ({ isActive, onComplete }: ZozoSpaceshipEntranceProps) => {
  const [stage, setStage] = useState<"entering" | "landed" | "complete">("entering");

  useEffect(() => {
    if (!isActive) return;

    const enterTimer = setTimeout(() => {
      setStage("landed");
    }, 2000);

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
            ? "top-[-200px] left-[20%] scale-50 -rotate-45"
            : "top-[40%] left-[10%] scale-100 rotate-0"
        }`}
      >
        <div className="relative">
          {/* Spaceship body - Zozo style with sparkles */}
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-primary animate-pulse border-4 border-accent/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-background animate-spin" style={{ animationDuration: "3s" }} />
                </div>
              </div>
            </div>
            
            {/* Engine glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-accent/40 blur-2xl rounded-full animate-pulse" />
            
            {/* Sparkle trail */}
            {stage === "entering" && (
              <>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-20">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="absolute top-[120%] left-1/2 -translate-x-1/2 w-1 h-16">
                  <Sparkles className="w-3 h-3 text-accent animate-pulse" style={{ animationDelay: "100ms" }} />
                </div>
                <div className="absolute top-[140%] left-1/2 -translate-x-1/2 w-1 h-12">
                  <Sparkles className="w-2 h-2 text-primary animate-pulse" style={{ animationDelay: "200ms" }} />
                </div>
              </>
            )}
          </div>

          {/* Landing burst */}
          {stage === "landed" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4">
              {[...Array(6)].map((_, i) => (
                <Sparkles 
                  key={i} 
                  className="w-6 h-6 text-accent animate-ping" 
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          )}

          {/* Zozo text reveal */}
          {stage === "landed" && (
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="text-primary font-bold text-2xl animate-fade-in tracking-wider flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                ZOZO ONLINE
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-accent text-sm animate-fade-in delay-300 text-center">
                Your AI Assistant is Ready
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Magical particles */}
      {stage === "entering" && (
        <>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1000}ms`,
              }}
            />
          ))}
        </>
      )}

      {/* Landing shockwave */}
      {stage === "landed" && (
        <div className="absolute top-[40%] left-[10%] w-64 h-64">
          <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping" />
          <div className="absolute inset-0 border-2 border-accent rounded-full animate-ping" style={{ animationDelay: "100ms" }} />
          <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping" style={{ animationDelay: "200ms" }} />
        </div>
      )}
    </div>
  );
};
