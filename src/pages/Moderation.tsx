import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsCeo } from "@/hooks/useIsCeo";

type Review = {
  id: string;
  subject_type: string;
  subject_id: string | null;
  subject_user_id: string | null;
  reason: string;
  severity: string;
  status: string;
  details: unknown;
  created_at: string;
};

const STATUSES = ["pending", "reviewed", "dismissed"] as const;

/**
 * Review-only moderation queue. Reviewers record a decision; nothing here
 * deletes content or suspends an account automatically.
 */
const Moderation = () => {
  const navigate = useNavigate();
  const { isCeo, loading: roleLoading } = useIsCeo();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("moderation_reviews")
      .select(
        "id, subject_type, subject_id, subject_user_id, reason, severity, status, details, created_at",
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setItems((data as Review[]) ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (isCeo) load();
  }, [isCeo, load]);

  const decide = async (id: string, next: "reviewed" | "dismissed") => {
    setSaving(id);
    const { error } = await supabase
      .from("moderation_reviews")
      .update({ status: next })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "reviewed" ? "Marked as reviewed" : "Report dismissed");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isCeo) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Reviewers only</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This queue is limited to accounts with reviewer access.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Review queue</h1>
            <p className="text-sm text-muted-foreground">
              Reports raised by people on Cyber Link. Decisions are recorded here only.
            </p>
          </div>
        </header>

        <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <TabsList>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nothing in this list.
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="bg-card/60 border-primary/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.subject_type}
                    </Badge>
                    <Badge
                      variant={item.severity === "high" ? "destructive" : "secondary"}
                      className="capitalize"
                    >
                      {item.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{item.reason}</p>
                  {item.subject_id && (
                    <p className="text-xs text-muted-foreground break-all">
                      Reference: {item.subject_id}
                    </p>
                  )}
                  {status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => decide(item.id, "reviewed")}
                        disabled={saving === item.id}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(item.id, "dismissed")}
                        disabled={saving === item.id}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Moderation;
