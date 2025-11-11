import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Flame, Award } from "lucide-react";

interface NFTCollection {
  name: string;
  floorPrice: number;
  volume24h: number;
  change24h: number;
  sales: number;
  icon: string;
}

const TRENDING_NFTS = [
  { name: "Bored Ape Yacht Club", icon: "🦧" },
  { name: "CryptoPunks", icon: "👾" },
  { name: "Azuki", icon: "🎴" },
  { name: "Doodles", icon: "🎨" },
  { name: "Clone X", icon: "🤖" },
  { name: "Moonbirds", icon: "🦉" },
];

export default function NFTMarketWidget() {
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);

  useEffect(() => {
    generateMockNFTData();
    const interval = setInterval(generateMockNFTData, 45000);
    return () => clearInterval(interval);
  }, []);

  const generateMockNFTData = () => {
    const mockData = TRENDING_NFTS.map((nft) => ({
      ...nft,
      floorPrice: Math.random() * 50 + 5,
      volume24h: Math.random() * 5000 + 500,
      change24h: (Math.random() - 0.3) * 30,
      sales: Math.floor(Math.random() * 200 + 50),
    }));

    setNftCollections(mockData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {nftCollections.map((nft) => (
        <Card key={nft.name} className="hover:bg-muted/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{nft.icon}</div>
                <div>
                  <CardTitle className="text-base">{nft.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {nft.sales} sales
                  </CardDescription>
                </div>
              </div>
              {nft.change24h > 10 && (
                <Badge variant="secondary" className="gap-1">
                  <Flame className="w-3 h-3" />
                  Hot
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Floor Price</span>
              <span className="font-bold">Ξ {nft.floorPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Volume</span>
              <span className="font-medium">Ξ {nft.volume24h.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Change</span>
              <span className={`font-medium flex items-center gap-1 ${nft.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {nft.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                {nft.change24h >= 0 ? '+' : ''}{nft.change24h.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
