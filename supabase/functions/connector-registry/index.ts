/**
 * Connector catalogue.
 *
 * Serves the manifest to the app and keeps the `connector_definitions` table in
 * sync with it, so services can be enabled, disabled or re-throttled from the
 * database without a deploy.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { CONNECTOR_MANIFEST } from "../_shared/connectorManifest.ts";
import { corsHeaders, json } from "../_shared/connectorEngine.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = CONNECTOR_MANIFEST.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      glyph: c.glyph,
      blurb: c.blurb,
      methods: c.methods,
      capabilities: c.capabilities,
      oauth_provider: c.oauthProvider ?? null,
      fields: c.fields ?? [],
      constraints: c.constraints ?? {},
      rate_policy: c.ratePolicy,
      availability: c.availability,
      docs_url: c.docsUrl ?? null,
      sort_order: c.sortOrder ?? 100,
    }));

    // Sync is idempotent and never disables a service an operator turned off.
    const { error: syncError } = await admin
      .from("connector_definitions")
      .upsert(rows, { onConflict: "id" });
    if (syncError) {
      return json({ error: syncError.message }, 400);
    }

    const { data, error } = await admin
      .from("connector_definitions")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (error) return json({ error: error.message }, 400);

    const notes = Object.fromEntries(
      CONNECTOR_MANIFEST.filter((c) => c.availabilityNote).map((c) => [
        c.id,
        c.availabilityNote,
      ]),
    );

    return json({ ok: true, services: data ?? [], availability_notes: notes });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      500,
    );
  }
});
