import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Rss } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONNECTOR_SERVICES } from "@/lib/connectors/registry";
import { useConnections } from "@/hooks/useConnections";

/** Post out to, and read back from, the platforms already connected. */
const PlatformComposer = () => {
  const { connections, isConnected } = useConnections();
  const [message, setMessage] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<{ service: string; items: unknown } | null>(null);

  const postable = CONNECTOR_SERVICES.filter(
    (s) => s.capabilities.includes("post") && isConnected(s.id),
  );
  const readable = CONNECTOR_SERVICES.filter(
    (s) => s.capabilities.includes("feed") && isConnected(s.id),
  );

  const toggle = (id: string) =>
    setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const send = async () => {
    if (!message.trim() || targets.length === 0) {
      toast.error("Write something and pick where it goes");
      return;
    }
    setBusy(true);
    try {
      const outcomes = await Promise.all(
        targets.map(async (serviceId) => {
          const { data, error } = await supabase.functions.invoke(
            "connector-action",
            {
              body: {
                action: "post",
                service_id: serviceId,
                payload: { message },
              },
            },
          );
          if (error) return { serviceId, ok: false, detail: error.message };
          const r = data?.results?.[0];
          return { serviceId, ok: Boolean(r?.ok), detail: r?.detail ?? "" };
        }),
      );
      const good = outcomes.filter((o) => o.ok);
      if (good.length) toast.success(`Posted to ${good.length} platform(s)`);
      outcomes
        .filter((o) => !o.ok)
        .forEach((o) => toast.error(`${o.serviceId}: ${o.detail}`));
      if (good.length === outcomes.length) setMessage("");
    } finally {
      setBusy(false);
    }
  };

  const loadFeed = async (serviceId: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("connector-action", {
        body: { action: "feed", service_id: serviceId },
      });
      if (error) throw error;
      const r = data?.results?.[0];
      if (!r?.ok) throw new Error(r?.detail ?? "Could not load");
      setFeed({ service: serviceId, items: data.data ?? r });
      toast.success("Feed loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load feed");
    } finally {
      setBusy(false);
    }
  };

  if (connections.length === 0) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 text-sm text-muted-foreground">
        Connect a platform below and you'll be able to post, comment and read your
        feeds right here.
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 space-y-4">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Send className="w-5 h-5 text-primary" />
        Post everywhere at once
      </h2>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's happening on the network?"
        rows={3}
      />

      <div className="flex flex-wrap gap-2">
        {postable.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={targets.includes(s.id) ? "default" : "outline"}
            onClick={() => toggle(s.id)}
          >
            <span className="mr-1" aria-hidden>
              {s.glyph}
            </span>
            {s.name}
          </Button>
        ))}
        {postable.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No posting-capable accounts connected yet.
          </span>
        )}
      </div>

      <Button onClick={send} disabled={busy} className="glow-primary">
        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Publish
      </Button>

      {readable.length > 0 && (
        <div className="pt-2 border-t border-primary/10 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Rss className="w-4 h-4 text-primary" />
            Read a feed
          </div>
          <div className="flex flex-wrap gap-2">
            {readable.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="outline"
                onClick={() => loadFeed(s.id)}
                disabled={busy}
              >
                {s.name}
              </Button>
            ))}
          </div>
          {feed && (
            <div className="rounded-lg border border-primary/10 bg-muted/20 p-3">
              <Badge variant="outline" className="mb-2 text-[10px]">
                {feed.service}
              </Badge>
              <pre className="text-[11px] text-muted-foreground overflow-x-auto max-h-56">
                {JSON.stringify(feed.items, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PlatformComposer;
