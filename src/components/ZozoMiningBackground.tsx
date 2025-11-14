import { useEffect, useState } from "react";
import { Sparkles, Star, Zap } from "lucide-react";

interface ZozoMiningBackgroundProps {
  isActive: boolean;
}

export const ZozoMiningBackground = ({ isActive }: ZozoMiningBackgroundProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number }>>([]);

  useEffect(() => {
    if (!isActive) return;

    // Generate random particles (stars, resources)
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 2 + 1,
    }));
    setParticles(newParticles);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated starfield */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-dark via-space-darker to-black">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-cyan-300 opacity-80 animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `twinkle ${particle.speed}s ease-in-out infinite, moveDown ${10 / particle.speed}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Zozo Spaceship */}
      <div className="absolute right-1/4 top-1/3 transform translate-x-1/2 -translate-y-1/2">
        <div className="relative animate-float">
          {/* Spaceship body - sleeker design for Zozo */}
          <div className="relative">
            <div className="relative w-20 h-20">
              {/* Main ship body */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-pulse-slow" />
              
              {/* Lightning bolt icon in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-10 h-10 text-yellow-300 animate-pulse" />
              </div>
              
              {/* Wing elements */}
              <div className="absolute top-1/2 -left-4 w-8 h-2 bg-gradient-to-r from-cyan-400/80 to-transparent transform -translate-y-1/2 -rotate-12" />
              <div className="absolute top-1/2 -right-4 w-8 h-2 bg-gradient-to-l from-cyan-400/80 to-transparent transform -translate-y-1/2 rotate-12" />
            </div>
            
            {/* Mining beam */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-2 h-32 bg-gradient-to-b from-cyan-400/80 via-blue-400/40 to-transparent animate-pulse" />
            
            {/* Engine trail */}
            <div className="absolute -right-8 top-1/2 w-16 h-2 bg-gradient-to-l from-cyan-400/0 via-cyan-400/60 to-cyan-400/20 blur-sm" />
            
            {/* Collection particles */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          </div>
        </div>
      </div>

      {/* Electric comets */}
      <div className="absolute top-1/3 left-1/4 animate-comet-pass">
        <div className="w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.8)]">
          <div className="absolute right-full mr-2 w-32 h-1 bg-gradient-to-l from-cyan-300/80 to-transparent" />
        </div>
      </div>

      <div className="absolute top-2/3 left-1/3 animate-comet-pass-delayed">
        <div className="w-3 h-3 rounded-full bg-blue-300 shadow-[0_0_15px_rgba(147,197,253,0.6)]">
          <div className="absolute right-full mr-2 w-24 h-1 bg-gradient-to-l from-blue-300/60 to-transparent" />
        </div>
      </div>

      {/* Nebula clouds */}
      <div className="absolute bottom-1/4 left-1/4 opacity-40">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/40 to-blue-500/40 blur-sm" />
      </div>

      <div className="absolute top-1/3 right-1/4 opacity-30">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 blur-sm" />
      </div>

      {/* Resource nodes with electric effect */}
      <div className="absolute top-1/2 left-1/3 animate-float-delayed">
        <Star className="w-6 h-6 text-cyan-300 animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Zap className="w-6 h-6 text-cyan-400 opacity-50" />
        </div>
      </div>

      <div className="absolute bottom-1/3 right-1/3 animate-float">
        <Star className="w-5 h-5 text-blue-300 animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Zap className="w-5 h-5 text-blue-400 opacity-50" />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(-10px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-15px) translateX(10px);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes moveDown {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        @keyframes comet-pass {
          0% {
            transform: translate(-100px, -100px) rotate(45deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(100vw, 100vh) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes comet-pass-delayed {
          0% {
            transform: translate(-50px, -50px) rotate(45deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(100vw, 100vh) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(34, 211, 238, 0.8);
          }
          50% {
            box-shadow: 0 0 50px rgba(34, 211, 238, 1);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 5s ease-in-out infinite;
        }

        .animate-comet-pass {
          animation: comet-pass 8s linear infinite;
        }

        .animate-comet-pass-delayed {
          animation: comet-pass-delayed 10s linear infinite 2s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
