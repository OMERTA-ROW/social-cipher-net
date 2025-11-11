import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QualificationData {
  qualifies: boolean;
  tier: string;
  followerCount: number;
  totalViews: number;
  needsFollowers: number;
  needsViews: number;
  hasActiveSubscription?: boolean;
  message: string;
}

export const QualificationProgress = () => {
  const [data, setData] = useState<QualificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkQualification();
    const interval = setInterval(checkQualification, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkQualification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: qualData, error } = await supabase.functions.invoke("check-qualifications", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setData(qualData);
    } catch (error) {
      console.error("Error checking qualifications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const followerProgress = (data.followerCount / 1000) * 100;
  const viewProgress = (data.totalViews / 10000) * 100;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Organic Growth Progress
            </CardTitle>
            <CardDescription className="mt-2">
              {data.qualifies 
                ? "🎉 You've unlocked CyberBasis tier!" 
                : "Grow your audience to unlock CyberBasis ($50/year)"}
            </CardDescription>
          </div>
          {data.qualifies && (
            <Badge variant="default" className="text-lg px-4 py-2 bg-primary">
              Qualified!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Followers Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">Followers</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.followerCount.toLocaleString()} / 1,000
            </span>
          </div>
          <Progress value={Math.min(followerProgress, 100)} className="h-3" />
          {!data.qualifies && data.needsFollowers > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.needsFollowers.toLocaleString()} more followers needed
            </p>
          )}
        </div>

        {/* Views Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <span className="font-semibold">Total Views</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.totalViews.toLocaleString()} / 10,000
            </span>
          </div>
          <Progress value={Math.min(viewProgress, 100)} className="h-3" />
          {!data.qualifies && data.needsViews > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.needsViews.toLocaleString()} more views needed
            </p>
          )}
        </div>

        {/* Status Message */}
        <div className={`p-4 rounded-lg ${data.qualifies ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
          <p className={`text-sm ${data.qualifies ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {data.message}
          </p>
          {data.qualifies && !data.hasActiveSubscription && (
            <p className="text-xs text-muted-foreground mt-2">
              💳 Payment checkout will open automatically to activate your CyberBasis subscription
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
