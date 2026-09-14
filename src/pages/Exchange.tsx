import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import CryptoMarketChart from "@/components/CryptoMarketChart";
import LinkedAccountManager from "@/components/accounts/LinkedAccountManager";
import FeeQuoteCalculator from "@/components/exchange/FeeQuoteCalculator";
import FeeReferencePanel from "@/components/exchange/FeeReferencePanel";
import FeeSettingsAdmin from "@/components/exchange/FeeSettingsAdmin";
import { useIsCeo } from "@/hooks/useIsCeo";

/**
 * CyberLink Exchange. Pricing, linked exchange accounts and live market data
 * only — no transfers or trades are executed until a real provider is
 * integrated and fee rates are configured.
 */
const Exchange = () => {
  const { isCeo } = useIsCeo();

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertTitle>Pricing and account linking only</AlertTitle>
        <AlertDescription>
          Trades, wallet sends and bank transfers are switched off until an exchange, wallet or banking provider is
          connected and fee rates are set. Nothing here moves money.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="markets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          {isCeo && <TabsTrigger value="admin">Fee settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="markets" className="space-y-4">
          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Live market data</CardTitle>
              <CardDescription>
                Real prices from the same public market feeds used across Trading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CryptoMarketChart />
            </CardContent>
          </Card>
          <Button asChild variant="outline">
            <Link to="/trading">Open full Trading workspace</Link>
          </Button>
        </TabsContent>

        <TabsContent value="accounts">
          <LinkedAccountManager
            category="trading"
            title="Linked exchange accounts"
            description="Keep several accounts per exchange and choose which one is active. Keys are stored encrypted on our servers — we never ask for passwords, seed phrases or private keys."
          />
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <FeeQuoteCalculator />
          <FeeReferencePanel />
        </TabsContent>

        {isCeo && (
          <TabsContent value="admin">
            <FeeSettingsAdmin />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Exchange;
