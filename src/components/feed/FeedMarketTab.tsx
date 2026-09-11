import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CryptoMarketChart from "@/components/CryptoMarketChart";
import StockMarketWidget from "@/components/StockMarketWidget";
import { TradingDisclaimer } from "@/components/market/TradingDisclaimer";
import { Globe, Gamepad2, Clapperboard } from "lucide-react";

const SECTIONS = [
  { label: "Cyber World", path: "/cyber-world", icon: Globe },
  { label: "Cyber Arena", path: "/cyber-arena", icon: Gamepad2 },
  { label: "Studio", path: "/studio", icon: Clapperboard },
];

const FeedMarketTab = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ label, path, icon: Icon }) => (
          <Button key={path} size="sm" variant="outline" onClick={() => navigate(path)}>
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>
      <CryptoMarketChart />
      <StockMarketWidget />
      <TradingDisclaimer />
    </div>
  );
};

export default FeedMarketTab;
