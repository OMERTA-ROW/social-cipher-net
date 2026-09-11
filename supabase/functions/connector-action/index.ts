/**
 * Connector action runner.
 *
 * Resolves the requested capability against the manifest and the service's
 * adapter, then executes it through the engine (rate budget, retries, backoff,
 * health, audit trail). Nothing here calls a provider directly.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getSecrets } from "../_shared/connectorVault.ts";
import { audit, corsHeaders, json } from "../_shared/connectorEngine.ts";
import { getDefinition, type Capability } from "../_shared/connectorManifest.ts";
import { getAdapter } from "../_shared/connectorAdapters.ts";

/** Friendly action names the app already uses, mapped onto capabilities. */
const ACTION_CAPABILITIES: Record<string, Capability[]> = {
  post: ["publish_text", "publish_image", "publish_video", "publish_audio"],
  publish: ["publish_text", "publish_image", "publish_video", "publish_audio"],
  feed: ["read_feed"],
  profile: ["read_profile"],
  comment: ["reply_comment"],
  messages: ["read_messages"],
  analytics: ["read_analytics"],
  revenue: ["read_revenue"],
  commerce: ["commerce"],
  import: ["import_assets"],
  multicast: ["live_ingest"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Sign in required" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    const serviceIds: string[] =
      action === "multicast"
        ? (Array.isArray(body.service_ids) ? body.service_ids : []).map(String)
        : [String(body.service_id ?? "")];

    if (serviceIds.length === 0 || serviceIds.some((s) => !s)) {
      return json({ error: "No destination selected" }, 400);
    }

    const wanted = ACTION_CAPABILITIES[action];
    if (!wanted) return json({ error: "Unknown action" }, 400);

    const { data: connections } = await admin
      .from("user_connections")
      .select("id, service_id, status, health")
      .eq("user_id", user.id)
      .in("service_id", serviceIds);

    const results: Array<{
      service_id: string;
      ok: boolean;
      detail: string;
      status?: number;
      data?: unknown;
    }> = [];

    for (const serviceId of serviceIds) {
      const definition = getDefinition(serviceId);
      const connection = connections?.find((c) => c.service_id === serviceId);

      if (!connection) {
        results.push({ service_id: serviceId, ok: false, detail: "Not connected" });
        continue;
      }
      if (connection.health === "needs_reconnect") {
        results.push({
          service_id: serviceId,
          ok: false,
          detail: "This connection needs to be reconnected before it can be used.",
        });
        continue;
      }

      // Which capability does this service actually support for the request?
      const capability = wanted.find((c) => definition?.capabilities.includes(c));
      const adapter = getAdapter(serviceId);
      const handler = capability ? adapter?.[capability] : undefined;

      if (!capability) {
        const note = definition?.availabilityNote;
        results.push({
          service_id: serviceId,
          ok: false,
          detail: note
            ? `${definition?.name ?? serviceId} cannot do this yet — ${note}`
            : `${definition?.name ?? serviceId} does not support ${action}.`,
        });
        await audit(admin, {
          userId: user.id,
          connectionId: connection.id,
          serviceId,
          action,
          status: "skipped",
          detail: "Capability not supported",
        });
        continue;
      }

      if (!handler) {
        results.push({
          service_id: serviceId,
          ok: false,
          detail:
            `${definition?.name ?? serviceId} is connected, but this action is not wired up yet.`,
        });
        continue;
      }

      const secrets = await getSecrets(admin, connection.id);
      const result = await handler({
        admin,
        connectionId: connection.id,
        serviceId,
        secrets,
        payload,
      });

      results.push({
        service_id: serviceId,
        ok: result.ok,
        detail: result.ok ? `${action} succeeded` : result.detail,
        status: result.status,
        data: result.data,
      });

      await audit(admin, {
        userId: user.id,
        connectionId: connection.id,
        serviceId,
        action,
        status: result.ok ? "ok" : result.status === 429 ? "rate_limited" : "error",
        httpStatus: result.status,
        detail: result.ok ? null : result.detail,
      });
    }

    return json({
      ok: results.some((r) => r.ok),
      results,
      data: results[0]?.data ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
