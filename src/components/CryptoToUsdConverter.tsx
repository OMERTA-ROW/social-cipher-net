import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import { getCryptoQuotes, messageOf, type Latency } from "@/services/marketData";

interface CryptoToUsdConverterProps {
  cryptoBalances: { [key: string]: string };
  onConversionComplete?: () => void;
}

export const CryptoToUsdConverter = ({ cryptoBalances, onConversionComplete }: CryptoToUsdConverterProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [converting, setConverting] = useState(false);
  const [estimatedUsd, setEstimatedUsd] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ source: string; latency: Latency; asOf: number } | null>(null);

  const availableCryptos = Object.entries(cryptoBalances)
    .filter(([_, balance]) => parseFloat(balance) > 0)
    .map(([crypto]) => crypto);

  const handleEstimate = async () => {
    if (!selectedCrypto || !amount || parseFloat(amount) <= 0) return;

    setPriceError(null);
    try {
      const res = await getCryptoQuotes([selectedCrypto]);
      const quote = res.quotes.find((q) => q.symbol.toUpperCase() === selectedCrypto.toUpperCase());
      if (!quote) throw new Error(`No live price available for ${selectedCrypto}`);
      const baseValue = parseFloat(amount) * quote.price;
      setEstimatedUsd(baseValue - baseValue * 0.02);
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf });
    } catch (error) {
      setEstimatedUsd(null);
      setMeta(null);
      setPriceError(messageOf(error));
    }
  };

  const handleConvert = async () => {
    if (!selectedCrypto || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const cryptoBalance = parseFloat(cryptoBalances[selectedCrypto] || "0");
    if (parseFloat(amount) > cryptoBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setConverting(true);

    try {
      const { data, error } = await supabase.functions.invoke("convert-crypto-to-usd", {
        body: {
          cryptoCurrency: selectedCrypto,
          amount: parseFloat(amount),
        },
      });

      if (error) throw error;

      toast.success(
        `Converted ${amount} ${selectedCrypto} to $${data.conversion.final_usd_value.toFixed(2)} (2% fee: $${data.conversion.surcharge.toFixed(2)})`
      );

      setAmount("");
      setEstimatedUsd(null);
      onConversionComplete?.();
    } catch (error: any) {
      console.error("Conversion error:", error);
      toast.error(error.message || "Failed to convert crypto");
    } finally {
      setConverting(false);
    }
  };

  if (availableCryptos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Convert Crypto to USD
          </CardTitle>
          <CardDescription>
            No crypto balance available to convert
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Convert Crypto to USD
        </CardTitle>
        <CardDescription>
          Convert your cryptocurrency to USD (2% conversion fee applies)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Cryptocurrency</Label>
          <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
            <SelectTrigger>
              <SelectValue placeholder="Choose crypto" />
            </SelectTrigger>
            <SelectContent>
              {availableCryptos.map((crypto) => (
                <SelectItem key={crypto} value={crypto}>
                  {crypto} ({parseFloat(cryptoBalances[crypto]).toFixed(6)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.000001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setEstimatedUsd(null);
            }}
            onBlur={handleEstimate}
          />
          {selectedCrypto && (
            <p className="text-sm text-muted-foreground">
              Available: {parseFloat(cryptoBalances[selectedCrypto]).toFixed(6)} {selectedCrypto}
            </p>
          )}
        </div>

        {estimatedUsd !== null && (
          <div className="p-4 bg-muted rounded-lg space-y-1">
            <p className="text-sm text-muted-foreground">Estimated USD (after 2% fee)</p>
            <p className="text-2xl font-bold">${estimatedUsd.toFixed(2)}</p>
          </div>
        )}

        <Button
          onClick={handleConvert}
          disabled={converting || !selectedCrypto || !amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          {converting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Converting...
            </>
          ) : (
            "Convert to USD"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A 2% surcharge fee will be deducted from the conversion amount
        </p>
      </CardContent>
    </Card>
  );
};
