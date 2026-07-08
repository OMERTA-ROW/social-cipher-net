import miningBg from "@/assets/realistic-mining-bg.jpg";

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
        className="absolute inset-0 w-full h-full object-cover animate-[kenburns_35s_ease-in-out_infinite_alternate]"
        loading="lazy"
        width={1920}
        height={1280}
      />
      <div className="absolute inset-0 bg-background/25" />
      <div className="absolute bottom-8 right-8 text-6xl font-bold text-primary drop-shadow-[0_0_20px_rgba(147,51,234,0.8)] animate-pulse">
        {symbol}
      </div>
      <style>{`@keyframes kenburns{0%{transform:scale(1)}100%{transform:scale(1.08)}}`}</style>
    </div>
  );
};
