import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsCeo } from "@/hooks/useIsCeo";
import { signInPath } from "@/lib/authRedirect";

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
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
};

const STATUSES = ["pending", "approved", "rejected"] as const;

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
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("moderation_reviews")
      .select(
        "id, subject_type, subject_id, subject_user_id, reason, severity, status, details, created_at, reviewed_by, reviewed_at, reviewer_note",
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
      if (!session) navigate(signInPath());
    });
  }, [navigate]);

  useEffect(() => {
    if (isCeo) load();
  }, [isCeo, load]);

  const decide = async (item: Review, next: "approved" | "rejected") => {
    setSaving(item.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("moderation_reviews")
      .update({
        status: next,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        reviewer_note: notes[item.id]?.trim() || null,
      })
      .eq("id", item.id);

    if (error) {
      setSaving(null);
      toast.error(error.message);
      return;
    }

    // Immutable trail of who decided what, and on which report.
    await supabase.rpc("log_security_event", {
      _user_id: user?.id ?? null,
      _event_type: "moderation_decision",
      _severity: next === "approved" ? "medium" : "low",
      _metadata: {
        review_id: item.id,
        decision: next,
        subject_type: item.subject_type,
        subject_id: item.subject_id,
        subject_user_id: item.subject_user_id,
        note: notes[item.id]?.trim() || null,
      },
    });

    setSaving(null);
    toast.success(
      next === "approved" ? "Report approved and recorded" : "Report rejected and recorded",
    );
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setNotes((prev) => {
      const rest = { ...prev };
      delete rest[item.id];
      return rest;
    });
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <main className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isCeo) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <main className="container mx-auto px-4 max-w-xl">
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
      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Reports raised by people on Cyber Link. Approving records the decision; it never
            removes content or suspends an account on its own.
          </p>
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
                  {status === "pending" ? (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        value={notes[item.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Optional note kept with the decision"
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(item, "approved")}
                          disabled={saving === item.id}
                        >
                          {saving === item.id && (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          )}
                          Approve report
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(item, "rejected")}
                          disabled={saving === item.id}
                        >
                          Reject report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {item.reviewed_at
                        ? `Decided ${new Date(item.reviewed_at).toLocaleString()}`
                        : "No decision time recorded"}
                      {item.reviewer_note ? ` — ${item.reviewer_note}` : ""}
                    </p>
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
