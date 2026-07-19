import miningBg from "@/assets/draco-alien-ship-scene.jpg";

interface DracoMiningBackgroundProps {
  isActive: boolean;
  minedCrypto?: string;
}

export const DracoMiningBackground = ({ isActive, minedCrypto = "BTC" }: DracoMiningBackgroundProps) => {
  if (!isActive) return null;

  const symbols: Record<string, string> = {
    BTC: "₿", ETH: "Ξ", DOGE: "Ð", SHIB: "🐕", PEPE: "🐸",
    USDC: "$", USDT: "₮", MATIC: "⬡", BNB: "ⓑ", SOL: "◎", ADA: "₳", AVAX: "🔺",
  };
  const symbol = symbols[minedCrypto] || "₿";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <img
        src={miningBg}
        alt="Realistic spaceship mining asteroids in deep space"
        className="absolute inset-0 w-full h-full object-cover animate-[kenburns_35s_ease-in-out_infinite_alternate,ship-hover_7s_ease-in-out_infinite]"
        loading="lazy"
        width={1920}
        height={1280}
      />
      <div className="absolute inset-0 bg-background/25" />
      <div className="absolute bottom-8 right-8 text-6xl font-bold text-primary drop-shadow-[0_0_20px_rgba(147,51,234,0.8)] animate-pulse">
        {symbol}
      </div>
      <style>{`
        @keyframes kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.08) translate(-1%,-1%)}}
        @keyframes ship-hover{0%,100%{filter:brightness(1) hue-rotate(0deg)}50%{filter:brightness(1.08) hue-rotate(8deg)}}
      `}</style>
    </div>
  );
};
