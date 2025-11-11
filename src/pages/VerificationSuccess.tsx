import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VerificationSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        throw new Error("No session ID found");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Update profile with verification
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verification_method: "payment",
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update payment record
      await supabase
        .from("verification_payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("stripe_payment_id", sessionId);

      toast({
        title: "Verification Complete!",
        description: "Your account is now verified with a badge.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <RealisticSpaceBackground />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center bg-card border-border">
          {verifying ? (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-3xl font-bold mb-4 text-foreground">Processing Verification...</h1>
              <p className="text-muted-foreground">Please wait while we verify your payment.</p>
            </>
          ) : (
            <>
              <BadgeCheck className="w-16 h-16 text-primary mx-auto mb-4 fill-current" />
              <h1 className="text-3xl font-bold mb-4 text-foreground">You're Verified!</h1>
              <p className="text-muted-foreground mb-6">
                Your account now has a verification badge. It will appear next to your name on all your posts.
              </p>
              <Button onClick={() => navigate("/")}>Back to Home</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerificationSuccess;
