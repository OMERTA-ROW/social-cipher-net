import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface HyperSpeedSequenceProps {
  isActive: boolean;
  destination: string;
  onComplete?: () => void;
}

export const HyperSpeedSequence = ({ isActive, destination, onComplete }: HyperSpeedSequenceProps) => {
  const [stage, setStage] = useState<"engaging" | "accelerating" | "jumping" | "complete">("engaging");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isActive) return;

    const engageTimer = setTimeout(() => setStage("accelerating"), 800);
    const accelTimer = setTimeout(() => setStage("jumping"), 1500);
    const jumpTimer = setTimeout(() => {
      setStage("complete");
      navigate(destination);
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(engageTimer);
      clearTimeout(accelTimer);
      clearTimeout(jumpTimer);
    };
  }, [isActive, destination, navigate, onComplete]);

  if (!isActive || stage === "complete") return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      {/* Star field with speed lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => {
          const delay = Math.random() * 1000;
          const duration = stage === "engaging" ? 3000 : stage === "accelerating" ? 800 : 200;
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          
          return (
            <div
              key={i}
              className="absolute w-1 bg-gradient-to-r from-transparent via-primary to-transparent"
              style={{
                left: `${startX}%`,
                top: `${startY}%`,
                height: stage === "jumping" ? "300px" : stage === "accelerating" ? "100px" : "2px",
                animation: `speed-line ${duration}ms linear infinite`,
                animationDelay: `${delay}ms`,
                opacity: stage === "jumping" ? 0.8 : stage === "accelerating" ? 0.5 : 0.3,
                transform: "translateX(-50%)",
              }}
            />
          );
        })}
      </div>

      {/* Hyperspace tunnel effect */}
      {(stage === "accelerating" || stage === "jumping") && (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute border-2 rounded-full"
              style={{
                width: `${(i + 1) * 100}px`,
                height: `${(i + 1) * 100}px`,
                borderColor: `hsl(var(--primary) / ${0.3 - i * 0.02})`,
                animation: stage === "jumping" 
                  ? `tunnel-expand ${500 - i * 20}ms ease-out forwards`
                  : `tunnel-pulse ${1000 + i * 100}ms ease-in-out infinite`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Draco ship in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`relative transition-all duration-500 ${
          stage === "jumping" ? "scale-150 opacity-0" : "scale-100 opacity-100"
        }`}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            className="text-primary animate-pulse"
          >
            <path
              d="M40 10 L60 50 L40 45 L20 50 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="40" cy="35" r="5" fill="hsl(var(--accent))" className="animate-pulse" />
          </svg>
          
          {/* Engine trails */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 flex gap-2">
            <div 
              className="w-2 bg-gradient-to-b from-accent to-transparent"
              style={{
                height: stage === "jumping" ? "200px" : stage === "accelerating" ? "100px" : "40px",
                transition: "height 0.3s ease-out",
              }}
            />
            <div 
              className="w-2 bg-gradient-to-b from-primary to-transparent"
              style={{
                height: stage === "jumping" ? "200px" : stage === "accelerating" ? "100px" : "40px",
                transition: "height 0.3s ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center space-y-2">
        <div className="text-2xl font-bold text-primary uppercase tracking-wider animate-pulse">
          {stage === "engaging" && "ENGAGING HYPERDRIVE"}
          {stage === "accelerating" && "ACCELERATING TO LIGHT SPEED"}
          {stage === "jumping" && "HYPERSPACE JUMP INITIATED"}
        </div>
        <div className="text-accent text-sm">
          Destination: {destination.replace("/", "").toUpperCase() || "CYBERLINK HUB"}
        </div>
      </div>

      {/* Speed indicator */}
      <div className="absolute top-10 right-10 space-y-1">
        <div className="text-xs text-muted-foreground">VELOCITY</div>
        <div className="text-3xl font-bold text-primary font-mono">
          {stage === "engaging" && "0.2c"}
          {stage === "accelerating" && "0.9c"}
          {stage === "jumping" && "∞"}
        </div>
      </div>

      {/* Chromatic aberration effect for jump */}
      {stage === "jumping" && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-red-500/20 animate-pulse" />
      )}

      <style>{`
        @keyframes speed-line {
          0% {
            transform: translateX(-50%) translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(100vh);
            opacity: 0;
          }
        }

        @keyframes tunnel-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
        }

        @keyframes tunnel-expand {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          100% {
            transform: scale(20);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
