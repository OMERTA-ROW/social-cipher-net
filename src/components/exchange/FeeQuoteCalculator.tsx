import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMinor, parseToMinor, type FeeCategory } from "@/lib/fees";

interface QuoteRow {
  amount_minor: number;
  platform_fee_minor: number;
  provider_fee_minor: number;
  network_fee_minor: number;
  total_minor: number;
  net_received_minor: number;
  minor_unit_scale: number;
  currency: string;
  payer: string;
  expires_at: string;
}

const OPERATIONS: Array<{ category: FeeCategory; operation: string; label: string; rail?: string }> = [
  { category: "exchange", operation: "spot_taker", label: "Spot trade (taker)" },
  { category: "exchange", operation: "spot_maker", label: "Spot trade (maker)" },
  { category: "exchange", operation: "conversion", label: "Instant conversion" },
  { category: "wallet", operation: "send", label: "External wallet send" },
  { category: "bank", operation: "deposit", label: "Bank deposit", rail: "ach" },
  { category: "bank", operation: "withdrawal", label: "Bank withdrawal", rail: "ach" },
];

/**
 * Asks the server for a price. All arithmetic and every rule check happen in
 * the edge function; this screen only shows what came back.
 */
export const FeeQuoteCalculator = () => {
  const [selected, setSelected] = useState(OPERATIONS[0].operation);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const op = OPERATIONS.find((o) => o.operation === selected)!;

  const requestQuote = async () => {
    setQuote(null);
    setMessage(null);
    const amountMinor = parseToMinor(amount, 2);
    if (amountMinor === null || amountMinor <= 0) {
      setMessage("Enter an amount greater than zero.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("exchange-quote", {
        body: {
          category: op.category,
          operation: op.operation,
          rail: op.rail ?? null,
          currency: "USD",
          amount_minor: amountMinor,
        },
      });
      if (error) throw new Error(error.message);
      const result = data as { ok?: boolean; message?: string; error?: string; quote?: QuoteRow };
      if (result?.error) setMessage(result.error);
      else if (!result?.ok) setMessage(result?.message ?? "No price is available for this yet.");
      else setQuote(result.quote!);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not reach the pricing service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" /> Fee estimate
        </CardTitle>
        <CardDescription>
          Check what a transfer or trade would cost. Prices come from the server; nothing is sent or traded here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fee-operation">Type</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="fee-operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((o) => (
                  <SelectItem key={o.operation} value={o.operation}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-amount">Amount (USD)</Label>
            <Input
              id="fee-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={requestQuote} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Get estimate
        </Button>

        {message && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
            <span>{message}</span>
          </div>
        )}

        {quote && (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-background/40 p-4 text-sm">
            <Row label="Amount" value={formatMinor(quote.amount_minor, quote.minor_unit_scale, quote.currency)} />
            <Row label="CyberLink fee" value={formatMinor(quote.platform_fee_minor, quote.minor_unit_scale, quote.currency)} />
            <Row label="Provider fee" value={formatMinor(quote.provider_fee_minor, quote.minor_unit_scale, quote.currency)} />
            <Row label="Network cost" value={formatMinor(quote.network_fee_minor, quote.minor_unit_scale, quote.currency)} />
            <div className="border-t border-border/60 pt-2">
              <Row label="Total charged" value={formatMinor(quote.total_minor, quote.minor_unit_scale, quote.currency)} strong />
              <Row label="Net received" value={formatMinor(quote.net_received_minor, quote.minor_unit_scale, quote.currency)} strong />
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>Paid by the {quote.payer}</span>
              <Badge variant="outline">Valid until {new Date(quote.expires_at).toLocaleTimeString()}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
    <span className={strong ? "font-semibold" : ""}>{value}</span>
  </div>
);

export default FeeQuoteCalculator;
