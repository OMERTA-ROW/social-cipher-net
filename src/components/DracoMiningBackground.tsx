import { useEffect, useState } from "react";
import { Rocket, Sparkles, Star } from "lucide-react";

interface DracoMiningBackgroundProps {
  isActive: boolean;
  minedCrypto?: string;
}

export const DracoMiningBackground = ({ isActive, minedCrypto = "BTC" }: DracoMiningBackgroundProps) => {
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

  const getCryptoSymbol = () => {
    const symbols: Record<string, string> = {
      'BTC': '₿', 'ETH': 'Ξ', 'DOGE': 'Ð', 'SHIB': '🐕', 'PEPE': '🐸',
      'USDC': '$', 'USDT': '₮', 'MATIC': '⬡', 'BNB': 'ⓑ', 'SOL': '◎',
      'ADA': '₳', 'AVAX': '🔺'
    };
    return symbols[minedCrypto] || '₿';
  };

  const getCryptoColor = () => {
    const colors: Record<string, string> = {
      'BTC': 'text-orange-500', 'ETH': 'text-blue-500', 'DOGE': 'text-yellow-500',
      'SHIB': 'text-red-500', 'PEPE': 'text-green-500', 'USDC': 'text-blue-400',
      'USDT': 'text-green-400', 'MATIC': 'text-purple-500', 'BNB': 'text-yellow-400',
      'SOL': 'text-cyan-500', 'ADA': 'text-blue-600', 'AVAX': 'text-red-400'
    };
    return colors[minedCrypto] || 'text-orange-500';
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated starfield */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-dark via-space-darker to-black">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white opacity-80 animate-pulse"
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

      {/* Draco Spaceship */}
      <div className="absolute left-1/4 top-1/3 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative animate-float">
          {/* Spaceship body */}
          <div className="relative">
            <Rocket className="w-20 h-20 text-primary rotate-45 drop-shadow-[0_0_20px_rgba(147,51,234,0.6)]" />
            
            {/* Mining beam */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-1 h-32 bg-gradient-to-b from-primary/80 via-primary/40 to-transparent animate-pulse" />
            
            {/* Engine trail */}
            <div className="absolute -left-8 top-1/2 w-16 h-2 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/20 blur-sm" />
            
            {/* Collection particles - Crypto symbols */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
              <span className={`text-2xl font-bold animate-pulse ${getCryptoColor()}`}>
                {getCryptoSymbol()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comets */}
      <div className="absolute top-1/4 right-1/4 animate-comet-pass">
        <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]">
          <div className="absolute left-full ml-2 w-32 h-1 bg-gradient-to-r from-cyan-400/80 to-transparent" />
        </div>
      </div>

      <div className="absolute top-2/3 right-1/3 animate-comet-pass-delayed">
        <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]">
          <div className="absolute left-full ml-2 w-24 h-1 bg-gradient-to-r from-blue-400/60 to-transparent" />
        </div>
      </div>

      {/* Distant planets */}
      <div className="absolute bottom-1/4 right-1/4 opacity-40">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 blur-sm" />
      </div>

      <div className="absolute top-1/3 left-1/4 opacity-30">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 blur-sm" />
      </div>

      {/* Crypto Resource nodes - scattered throughout space */}
      <div className="absolute top-1/2 right-1/3 animate-float-delayed">
        <div className="relative">
          <Star className="w-6 h-6 text-yellow-400 animate-pulse" />
          <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold ${getCryptoColor()}`}>
            {getCryptoSymbol()}
          </span>
        </div>
      </div>

      <div className="absolute bottom-1/3 left-1/3 animate-float">
        <div className="relative">
          <Star className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold ${getCryptoColor()}`}>
            {getCryptoSymbol()}
          </span>
        </div>
      </div>

      <div className="absolute top-1/4 left-1/2 animate-float-delayed">
        <div className="relative">
          <Star className="w-4 h-4 text-green-400 animate-pulse" />
          <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold ${getCryptoColor()}`}>
            {getCryptoSymbol()}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-15px) translateX(-10px);
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
            transform: translate(100vw, -100px) rotate(-45deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(-100px, 100vh) rotate(-45deg);
            opacity: 0;
          }
        }

        @keyframes comet-pass-delayed {
          0% {
            transform: translate(100vw, -50px) rotate(-45deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(-50px, 100vh) rotate(-45deg);
            opacity: 0;
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
      `}</style>
    </div>
  );
};
