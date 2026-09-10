import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Signal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { multicastServices } from "@/lib/connectors/registry";
import { useConnections } from "@/hooks/useConnections";

const MulticastPanel = () => {
  const { isConnected } = useConnections();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<
    Array<{ service_id: string; ok: boolean; detail: string }>
  >([]);

  const targets = multicastServices();

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const go = async () => {
    if (selected.length === 0) {
      toast.error("Pick at least one destination");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("connector-action", {
        body: { action: "multicast", service_ids: selected },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.results ?? []);
      const ready = (data.results ?? []).filter(
        (r: { ok: boolean }) => r.ok,
      ).length;
      toast.success(`${ready} of ${selected.length} destinations ready`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start multicast");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
      <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
        <Signal className="w-5 h-5 text-primary" />
        Multicast your live stream
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Send one broadcast out to every destination you have connected.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {targets.map((service) => {
          const connected = isConnected(service.id);
          const result = results.find((r) => r.service_id === service.id);
          return (
            <label
              key={service.id}
              className="flex items-center gap-3 rounded-lg border border-primary/10 bg-muted/20 px-3 py-2 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(service.id)}
                onCheckedChange={() => toggle(service.id)}
                disabled={!connected}
              />
              <span aria-hidden>{service.glyph}</span>
              <span className="flex-1 text-sm text-foreground">{service.name}</span>
              {!connected ? (
                <Badge variant="outline" className="text-[10px]">
                  Not connected
                </Badge>
              ) : result ? (
                <Badge
                  variant={result.ok ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {result.ok ? "Ready" : "Needs setup"}
                </Badge>
              ) : null}
            </label>
          );
        })}
      </div>

      {results.some((r) => !r.ok) && (
        <ul className="mb-4 space-y-1 text-xs text-muted-foreground">
          {results
            .filter((r) => !r.ok)
            .map((r) => (
              <li key={r.service_id}>
                <span className="text-foreground">{r.service_id}</span>: {r.detail}
              </li>
            ))}
        </ul>
      )}

      <Button onClick={go} disabled={busy} className="glow-primary">
        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Go live everywhere
      </Button>
    </Card>
  );
};

export default MulticastPanel;
