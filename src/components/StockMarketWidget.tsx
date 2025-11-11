import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  data: { value: number }[];
}

const MAJOR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "NFLX", name: "Netflix" },
];

export default function StockMarketWidget() {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    generateMockStocks();
    const interval = setInterval(generateMockStocks, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateMockStocks = () => {
    const mockStocks = MAJOR_STOCKS.map((stock) => {
      const basePrice = Math.random() * 300 + 100;
      const change = (Math.random() - 0.5) * 10;
      const changePercent = (change / basePrice) * 100;
      
      const data = Array.from({ length: 20 }, () => ({
        value: basePrice + (Math.random() - 0.5) * 20,
      }));

      return {
        ...stock,
        price: basePrice,
        change,
        changePercent,
        data,
      };
    });

    setStocks(mockStocks);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stocks.map((stock) => (
        <Card key={stock.symbol} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                <CardDescription className="text-xs">{stock.name}</CardDescription>
              </div>
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
            <div className={`flex items-center gap-1 text-sm ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stock.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)</span>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={stock.data}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={stock.change >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
