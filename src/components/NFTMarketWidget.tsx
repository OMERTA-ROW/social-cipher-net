import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Flame } from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { useNftMarket } from "@/hooks/useMarketData";

const usd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

export default function NFTMarketWidget() {
  const nft = useNftMarket(undefined, 120000);

  return (
    <div className="space-y-4">
      <MarketSourceBadge
        source={nft.source}
        latency={nft.latency}
        asOf={nft.asOf}
        connected={nft.connected}
        error={nft.error}
      />

      {nft.error && !nft.data ? (
        <MarketUnavailable message={nft.error} onRetry={nft.refresh} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(nft.data ?? []).map((collection) => (
            <Card key={collection.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={`${collection.name} collection artwork`}
                        loading="lazy"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                    )}
                    <div>
                      <CardTitle className="text-base">{collection.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {collection.owners.toLocaleString()} owners
                      </CardDescription>
                    </div>
                  </div>
                  {collection.floorChange24h > 10 && (
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
                  <span className="font-bold">
                    {collection.floorPrice.toFixed(2)} {collection.nativeCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">24h Volume</span>
                  <span className="font-medium">{usd(collection.volume24hUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">24h Change</span>
                  <span className={`font-medium flex items-center gap-1 ${collection.floorChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {collection.floorChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {collection.floorChange24h >= 0 ? '+' : ''}{collection.floorChange24h.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TradingDisclaimer />
    </div>
  );
}
