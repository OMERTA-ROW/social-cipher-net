import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldAlert } from "lucide-react";

interface Props {
  miningType: "draco" | "zozo";
  isUnlocked: boolean;
}

export const ExternalMiningAccounts = ({ miningType, isUnlocked }: Props) => {
  const navigate = useNavigate();
  if (!isUnlocked) return null;
  return (
    <Card className="mt-6 border-primary/20 bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" />External mining accounts</CardTitle>
        <CardDescription>
          {miningType.toUpperCase()} cannot connect or create external accounts until a provider-specific, server-verified integration is configured.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">Cyber Link never requests mining passwords, private keys, seed phrases, or unverified API secrets.</p>
        <Button variant="outline" onClick={() => navigate("/integrations")}>
          <ExternalLink className="mr-2 h-4 w-4" /> Review integration status
        </Button>
      </CardContent>
    </Card>
  );
};