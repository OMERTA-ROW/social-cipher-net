import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Download, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { creativeServices } from "@/lib/connectors/registry";
import { useConnections } from "@/hooks/useConnections";

interface RemoteItem {
  external_id: string;
  name: string;
  asset_type: string;
  thumbnail?: string;
}

interface ConnectedAccountsPanelProps {
  onImported?: () => void;
}

/** Creative suite connections plus pulling existing work into the library. */
const ConnectedAccountsPanel = ({ onImported }: ConnectedAccountsPanelProps) => {
  const navigate = useNavigate();
  const { isConnected, byService } = useConnections();
  const [service, setService] = useState<string | null>(null);
  const [items, setItems] = useState<RemoteItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const browse = async (serviceId: string) => {
    setBusy(true);
    setService(serviceId);
    setItems([]);
    setSelected([]);
    try {
      const { data, error } = await supabase.functions.invoke("creative-import", {
        body: { action: "list", service_id: serviceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setItems(data.items ?? []);
      if ((data.items ?? []).length === 0) toast.info("No projects found there");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach that service");
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    if (!service || selected.length === 0) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("creative-import", {
        body: { action: "import", service_id: service, external_ids: selected },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Imported ${data.imported} item(s)`);
      setSelected([]);
      onImported?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-bold text-foreground mr-auto">
            Connected creative accounts
          </h3>
          <Button size="sm" variant="outline" onClick={() => navigate("/connectors")}>
            <Plug className="w-4 h-4 mr-2" />
            All connectors
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {creativeServices().map((s) => {
            const connected = isConnected(s.id);
            const connection = byService(s.id);
            return (
              <Card
                key={s.id}
                className="p-3 bg-muted/20 border-primary/10 flex items-center gap-3"
              >
                <span className="text-2xl" aria-hidden>
                  {s.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {connection?.account_name ?? s.blurb}
                  </p>
                </div>
                {connected ? (
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Linked
                    </Badge>
                    <Button size="sm" onClick={() => browse(s.id)} disabled={busy}>
                      Browse
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/connectors")}
                  >
                    Connect
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {(busy || items.length > 0) && (
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-foreground mr-auto">
              Your {service} projects
            </h3>
            <Button
              size="sm"
              onClick={importSelected}
              disabled={busy || selected.length === 0}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Import {selected.length || ""}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((item) => (
              <label
                key={item.external_id}
                className="rounded border border-primary/10 bg-muted/20 p-2 cursor-pointer"
              >
                <div className="aspect-square rounded bg-black/40 mb-2 overflow-hidden flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item.asset_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(item.external_id)}
                    onCheckedChange={() =>
                      setSelected((s) =>
                        s.includes(item.external_id)
                          ? s.filter((x) => x !== item.external_id)
                          : [...s, item.external_id],
                      )
                    }
                  />
                  <span className="text-xs text-foreground truncate">{item.name}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ConnectedAccountsPanel;
