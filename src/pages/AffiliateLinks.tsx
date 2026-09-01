import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { ExternalAffiliateLinksManager } from "@/components/ExternalAffiliateLinksManager";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasCyberPro, setHasCyberPro] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has CyberPro subscription
    const { data, error } = await supabase.functions.invoke("check-subscription");
    
    if (error) {
      console.error("Error checking subscription:", error);
      toast({
        title: "Error",
        description: "Failed to verify subscription status",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const tier = data?.tier || "CyberFree";
    setHasCyberPro(tier === "CyberPro");
    setLoading(false);
  };

  const handleUpgrade = () => {
    navigate("/subscription");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-48 mx-auto mb-4" />
                <Skeleton className="h-6 w-96 mx-auto" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {!hasCyberPro ? (
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl">CyberPro Feature</CardTitle>
                <CardDescription className="text-base">
                  External affiliate link management is a premium feature exclusive to CyberPro members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-lg">With CyberPro, you can:</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Add unlimited Amazon, Walmart, and luxury brand affiliate links</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Manage ClickBank and other affiliate network links</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Track clicks and conversions with analytics</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Create branded deal campaigns with conversion tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Earn 75% more on all your creator content earnings</span>
                    </li>
                  </ul>
                </div>
                <Button onClick={handleUpgrade} className="w-full" size="lg">
                  Upgrade to CyberPro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ExternalAffiliateLinksManager />
          )}
        </div>
      </main>
    </div>
  );
}
