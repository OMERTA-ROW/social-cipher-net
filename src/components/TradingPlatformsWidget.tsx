import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp } from "lucide-react";

interface TradingPlatform {
  name: string;
  type: string;
  description: string;
  features: string[];
  logo: string;
}

const TRADING_PLATFORMS: TradingPlatform[] = [
  {
    name: "Binance",
    type: "Crypto Exchange",
    description: "World's largest crypto exchange",
    features: ["Spot Trading", "Futures", "Staking", "NFTs"],
    logo: "🔶",
  },
  {
    name: "Coinbase",
    type: "Crypto Exchange",
    description: "Easy-to-use crypto platform",
    features: ["Buy/Sell Crypto", "NFTs", "Wallet", "Learn & Earn"],
    logo: "🔷",
  },
  {
    name: "Robinhood",
    type: "Stock & Crypto",
    description: "Commission-free trading",
    features: ["Stocks", "Options", "Crypto", "ETFs"],
    logo: "💚",
  },
  {
    name: "Interactive Brokers",
    type: "Stock Trading",
    description: "Professional trading platform",
    features: ["Global Markets", "Low Fees", "Advanced Tools", "Research"],
    logo: "📊",
  },
  {
    name: "Kraken",
    type: "Crypto Exchange",
    description: "Secure crypto trading",
    features: ["Spot", "Margin", "Futures", "Staking"],
    logo: "🐙",
  },
  {
    name: "OpenSea",
    type: "NFT Marketplace",
    description: "Largest NFT marketplace",
    features: ["Buy NFTs", "Sell NFTs", "Create", "Collections"],
    logo: "🌊",
  },
  {
    name: "Uniswap",
    type: "DEX",
    description: "Decentralized exchange",
    features: ["Token Swaps", "Liquidity Pools", "DeFi", "Governance"],
    logo: "🦄",
  },
  {
    name: "eToro",
    type: "Social Trading",
    description: "Copy trading & social investing",
    features: ["Stocks", "Crypto", "Copy Trading", "Social Feed"],
    logo: "🎯",
  },
];

export default function TradingPlatformsWidget() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {TRADING_PLATFORMS.map((platform) => (
        <Card key={platform.name} className="hover:bg-muted/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">{platform.logo}</div>
              <Badge variant="outline">{platform.type}</Badge>
            </div>
            <CardTitle className="text-lg">{platform.name}</CardTitle>
            <CardDescription className="text-xs">{platform.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {platform.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
            <Button className="w-full" variant="outline" size="sm">
              <ExternalLink className="w-3 h-3 mr-2" />
              Connect Platform
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
