import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
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
  const [values, setValues] = useState<Record<string, string>>({});
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [configured, setConfigured] = useState<string[] | null>(null);

  // Which services already have their developer app set up on the server.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    supabase.functions
      .invoke("connector-oauth", { body: { action: "status" } })
      .then(({ data }) => {
        if (alive && Array.isArray(data?.configured)) setConfigured(data.configured);
      })
      .catch(() => {
        if (alive) setConfigured(null);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!service) return null;


  const supportsOauth = service.methods.includes("oauth") && service.oauthProvider;
  const oauthReady =
    configured === null ? true : configured.includes(String(service.oauthProvider));

  const startOauth = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connector-oauth", {
        body: {
          action: "start",
          provider: service.oauthProvider,
          service_id: service.id,
          redirect_uri: `${window.location.origin}/connectors`,
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
      data.authorize_url = payload?.authorize_url ?? data?.authorize_url;

      // Authorise in a popup so the user keeps their place on this page.
      const popup = window.open(
        data.authorize_url,
        "cyberlink-oauth",
        "width=600,height=760,noopener=no,noreferrer=no",
      );
      if (!popup) {
        window.location.href = data.authorize_url;
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

  const saveKeys = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "connector-credentials",
        {
          body: {
            action: "save",
            service_id: service.id,
            account_name: accountName || null,
            credentials: values,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${service.name} connected`);
      setValues({});
      setAccountName("");
      onConnected();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
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
              disabled={starting}
            >
              {starting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Authorize with {service.name}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You sign in on {service.name} — Cyber Link never sees your password.
            </p>
            {service.fields?.length ? (
              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
            ) : null}
          </div>
        )}

        {service.fields?.length ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="w-4 h-4 text-primary" />
              Enter your keys manually
            </div>

            <div className="space-y-1">
              <Label htmlFor="account-name">Label (optional)</Label>
              <Input
                id="account-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="My main channel"
              />
            </div>

            {service.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.secret ? "password" : "text"}
                  autoComplete="off"
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                />
                {field.helper && (
                  <p className="text-xs text-muted-foreground">{field.helper}</p>
                )}
              </div>
            ))}

            <Button className="w-full" onClick={saveKeys} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save securely
            </Button>
            <p className="text-xs text-muted-foreground">
              Keys are stored server-side only and are never sent back to your browser.
            </p>
          </div>
        ) : null}

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
