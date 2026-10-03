import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ConnectorService } from "@/lib/connectors/registry";

interface ConnectDialogProps {
  service: ConnectorService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

const ConnectDialog = ({
  service,
  open,
  onOpenChange,
  onConnected,
}: ConnectDialogProps) => {
  const [starting, setStarting] = useState(false);
  const [configured, setConfigured] = useState<string[] | null>(null);
  const [statusResolved, setStatusResolved] = useState(false);

  // Which services already have their developer app set up on the server.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    supabase.functions
      .invoke("connector-oauth", { body: { action: "status" } })
      .then(({ data }) => {
        if (alive && Array.isArray(data?.configured)) setConfigured(data.configured);
        if (alive) setStatusResolved(true);
      })
      .catch(() => {
        if (alive) {
          setConfigured([]);
          setStatusResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!service) return null;


  const supportsOauth = service.methods.includes("oauth") && service.oauthProvider;
  const oauthReady = statusResolved && (configured ?? []).includes(String(service.oauthProvider));

  const startOauth = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connector-oauth", {
        body: {
          action: "start",
          provider: service.oauthProvider,
          service_id: service.id,
        },
      });
      // A refused start comes back as a non-2xx, so read the real reason out of it.
      let payload = data;
      if (error) {
        const raw =
          typeof (error as { context?: { text?: () => Promise<string> } }).context?.text ===
          "function"
            ? await (error as { context: { text: () => Promise<string> } }).context.text()
            : "";
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = null;
        }
        if (!payload?.error) throw error;
      }
      if (payload?.error === "not_configured") {
        toast.error(`${service.name} isn't set up for one-click sign-in yet`, {
          description:
            payload.message ?? "Use the key entry below in the meantime.",
        });
        return;
      }
      if (payload?.error) throw new Error(payload.error);
      const authorizeUrl: string | undefined = payload?.authorize_url ?? data?.authorize_url;
      if (!authorizeUrl) throw new Error("No sign-in link was returned");

      // Authorise in a popup so the user keeps their place on this page.
      // The popup inherits this tab's session storage, so /auth/callback knows
      // it is an integration return and sends the popup back here.
      rememberIntegrationReturn("/connectors");
      const popup = window.open(
        authorizeUrl,
        "cyberlink-oauth",
        "width=600,height=760,noopener=no,noreferrer=no",
      );
      if (!popup) {
        window.location.href = authorizeUrl;
        return;
      }
      toast.info(`Finish signing in to ${service.name} in the popup window`);
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : `Could not start ${service.name} sign-in`,
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>{service.glyph}</span>
            Connect {service.name}
          </DialogTitle>
          <DialogDescription>{service.blurb}</DialogDescription>
        </DialogHeader>

        {supportsOauth && (
          <div className="space-y-3">
            <Button
              className="w-full glow-primary"
              onClick={startOauth}
              disabled={starting || !oauthReady || !statusResolved}
            >
              {starting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              {!statusResolved ? "Checking setup…" : oauthReady ? `Authorize with ${service.name}` : "Setup required"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {oauthReady
                ? `You sign in on ${service.name} — Cyber Link never sees your password.`
                : `Cyber Link must register a ${service.name} developer app, store its client ID and secret server-side, approve the requested scopes, and allow this site's /integrations callback.`}
            </p>
          </div>
        )}

        {!supportsOauth && (
          <div className="flex gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>This connection is unavailable until Cyber Link adds a verified provider integration. Never enter a password, private key, or recovery phrase here.</p>
          </div>
        )}

        {service.docsUrl && (
          <a
            href={service.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Where do I find these?
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectDialog;
