import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FeeRuleRow {
  id: string;
  category: string;
  operation: string;
  rail: string | null;
  asset: string | null;
  currency: string;
  percent_bps: number | null;
  fixed_minor: number | null;
  min_fee_minor: number | null;
  max_fee_minor: number | null;
  payer: string;
  minor_unit_scale: number;
  quote_ttl_seconds: number;
  is_configured: boolean;
  is_active: boolean;
  effective_from: string | null;
}

/**
 * Fee rates are written straight to `fee_settings`, which only admins can
 * change — the database policy enforces that, not this screen.
 */
export const FeeSettingsAdmin = () => {
  const [rules, setRules] = useState<FeeRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("fee_settings")
      .select("*")
      .order("category")
      .order("operation");
    if (error) toast.error(error.message);
    setRules((data ?? []) as FeeRuleRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (rule: FeeRuleRow, patch: Partial<FeeRuleRow>) => {
    setSaving(rule.id);
    const { error } = await supabase.from("fee_settings").update(patch).eq("id", rule.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Fee rule updated");
      await load();
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading fee settings…
      </div>
    );
  }

  return (
    <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" /> Fee settings
        </CardTitle>
        <CardDescription>
          Owner only. A rule prices nothing until it has a rate, a start date and is switched on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No fee rules exist yet. Add rows to the fee settings table to start pricing.
          </p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {rule.category} · {rule.operation}
                {rule.rail ? ` · ${rule.rail}` : ""}
                {rule.asset ? ` · ${rule.asset}` : ""}
              </span>
              <Badge variant="outline">{rule.currency}</Badge>
              <Badge variant={rule.is_configured ? "secondary" : "destructive"}>
                {rule.is_configured ? "Configured" : "Not set"}
              </Badge>
              <Badge variant={rule.is_active ? "default" : "secondary"}>
                {rule.is_active ? "Live" : "Off"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Field
                label="Rate (basis points)"
                value={rule.percent_bps}
                onCommit={(v) => update(rule, { percent_bps: v })}
              />
              <Field label="Fixed (minor units)" value={rule.fixed_minor} onCommit={(v) => update(rule, { fixed_minor: v })} />
              <Field label="Minimum fee" value={rule.min_fee_minor} onCommit={(v) => update(rule, { min_fee_minor: v })} />
              <Field label="Maximum fee" value={rule.max_fee_minor} onCommit={(v) => update(rule, { max_fee_minor: v })} />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={rule.is_configured}
                  disabled={saving === rule.id}
                  onCheckedChange={(checked) =>
                    update(rule, {
                      is_configured: checked,
                      effective_from: checked ? rule.effective_from ?? new Date().toISOString() : null,
                      is_active: checked ? rule.is_active : false,
                    })
                  }
                />
                Mark as configured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={rule.is_active}
                  disabled={saving === rule.id || !rule.is_configured}
                  onCheckedChange={(checked) => update(rule, { is_active: checked })}
                />
                Charge this fee
              </label>
              <span className="text-xs text-muted-foreground">
                Paid by the {rule.payer} · quote valid {rule.quote_ttl_seconds}s
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const Field = ({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
}) => {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          const next = trimmed === "" ? null : Number(trimmed);
          if (next !== null && !Number.isSafeInteger(next)) {
            toast.error("Use whole numbers only");
            return;
          }
          if (next !== value) onCommit(next);
        }}
      />
    </div>
  );
};

export default FeeSettingsAdmin;
