import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  data: { time: string; price: number }[];
}

const CRYPTO_SYMBOLS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "SOL", name: "Solana" },
];

export default function CryptoMarketChart() {
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoPrices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-crypto-prices", {
        body: { currencies: CRYPTO_SYMBOLS.map(c => c.symbol) },
      });

      if (error) throw error;

      const prices: CryptoPrice[] = CRYPTO_SYMBOLS.map((crypto) => {
        const priceData = data.prices[crypto.symbol];
        const mockData = generateMockChartData(priceData?.usd || 0);
        
        return {
          symbol: crypto.symbol,
          name: crypto.name,
          price: priceData?.usd || 0,
          change24h: priceData?.change24h || 0,
          data: mockData,
        };
      });

      setCryptoPrices(prices);
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockChartData = (currentPrice: number) => {
    const data = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 0.1;
      data.push({
        time: new Date(now - i * 3600000).toLocaleTimeString('en-US', { hour: '2-digit' }),
        price: currentPrice * (1 + variation),
      });
    }
    return data;
  };

  if (loading) {
    return <div className="text-center py-8">Loading crypto markets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cryptoPrices.slice(0, 4).map((crypto) => (
          <Card key={crypto.symbol} className="bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{crypto.name}</CardDescription>
              <CardTitle className="text-xl">${crypto.price.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-1 text-sm ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {crypto.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(crypto.change24h).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={cryptoPrices[0]?.symbol} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8">
          {cryptoPrices.map((crypto) => (
            <TabsTrigger key={crypto.symbol} value={crypto.symbol}>
              {crypto.symbol}
            </TabsTrigger>
          ))}
        </TabsList>

        {cryptoPrices.map((crypto) => (
          <TabsContent key={crypto.symbol} value={crypto.symbol}>
            <Card>
              <CardHeader>
                <CardTitle>{crypto.name} Price Chart</CardTitle>
                <CardDescription>24-hour price movement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={crypto.data}>
                    <defs>
                      <linearGradient id={`gradient-${crypto.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1}
                      fill={`url(#gradient-${crypto.symbol})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
