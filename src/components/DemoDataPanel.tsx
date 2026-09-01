import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

/**
 * Admin-only control for the seeded demo social data.
 * Every seeded profile/post carries `is_demo = true`, so a purge removes it cleanly.
 */
const DemoDataPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoCount, setDemoCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<"seed" | "purge" | null>(null);

  const refresh = async () => {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_demo", true);
    setDemoCount(count ?? 0);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) return;
      setIsAdmin(true);
      refresh();
    })();
  }, []);

  if (!isAdmin) return null;

  const run = async (action: "seed" | "purge") => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-social", {
        body: { action },
      });
      if (error) throw error;
      if (data?.message) toast.info(data.message);
      else if (action === "seed") toast.success(`Seeded ${data.seeded} demo accounts and ${data.posts} posts`);
      else toast.success(`Removed ${data.purged} demo accounts`);
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Demo data action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 bg-card/70 backdrop-blur-sm border-border/60">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold">Demo data</h3>
        <Badge variant="outline">Admin</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Seeded sample accounts, posts, replies, likes and follows so new visitors see a populated
        feed. All of it is flagged as demo content and can be removed in one click.
        {demoCount !== null && ` Currently ${demoCount} demo account${demoCount === 1 ? "" : "s"}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run("seed")} disabled={busy !== null}>
          {busy === "seed" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Seed demo data
        </Button>
        <Button variant="destructive" onClick={() => run("purge")} disabled={busy !== null || demoCount === 0}>
          {busy === "purge" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Remove demo data
        </Button>
      </div>
    </Card>
  );
};

export default DemoDataPanel;
