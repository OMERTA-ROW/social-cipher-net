import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Users, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Verification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [followerCount] = useState(0); // TODO: Implement follower counting

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentVerification = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-verification-payment");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFollowerVerification = async () => {
    setProcessing(true);
    try {
      if (followerCount < 10000) {
        toast({
          title: "Not Eligible",
          description: "You need at least 10,000 followers to verify via followers.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verification_method: "followers",
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your account has been verified!",
      });
      
      checkProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <RealisticSpaceBackground />
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (profile?.is_verified) {
    return (
      <div className="min-h-screen">
        <RealisticSpaceBackground />
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto p-8 text-center bg-card border-border">
            <BadgeCheck className="w-16 h-16 text-primary mx-auto mb-4 fill-current" />
            <h1 className="text-3xl font-bold mb-4 text-foreground">Already Verified</h1>
            <p className="text-muted-foreground mb-4">
              Your account was verified via {profile.verification_method} on{" "}
              {new Date(profile.verified_at).toLocaleDateString()}.
            </p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <RealisticSpaceBackground />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <BadgeCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4 text-foreground">Get Verified</h1>
            <p className="text-muted-foreground text-lg">
              Stand out with a verification badge next to your name
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 bg-card border-border hover:border-primary/50 transition-all">
              <CreditCard className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4 text-foreground">Payment Verification</h2>
              <p className="text-muted-foreground mb-6">
                Get instantly verified with a one-time payment of $150
              </p>
              <ul className="space-y-2 mb-6 text-foreground">
                <li>✓ Instant verification</li>
                <li>✓ Verification badge on all posts</li>
                <li>✓ Increased credibility</li>
                <li>✓ One-time payment, lifetime benefit</li>
              </ul>
              <Button
                onClick={handlePaymentVerification}
                disabled={processing}
                className="w-full"
              >
                {processing ? "Processing..." : "Pay $150 to Verify"}
              </Button>
            </Card>

            <Card className="p-8 bg-card border-border hover:border-primary/50 transition-all">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4 text-foreground">Follower Verification</h2>
              <p className="text-muted-foreground mb-6">
                Get verified for free with 10,000+ followers
              </p>
              <ul className="space-y-2 mb-6 text-foreground">
                <li>✓ Free verification</li>
                <li>✓ Verification badge on all posts</li>
                <li>✓ Increased credibility</li>
                <li>✓ Recognition of your influence</li>
              </ul>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Current followers: <span className="font-bold text-foreground">{followerCount.toLocaleString()}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Required: <span className="font-bold text-foreground">10,000</span>
                </p>
              </div>
              <Button
                onClick={handleFollowerVerification}
                disabled={processing || followerCount < 10000}
                className="w-full"
                variant="secondary"
              >
                {processing ? "Processing..." : followerCount >= 10000 ? "Verify with Followers" : "Not Enough Followers"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verification;
