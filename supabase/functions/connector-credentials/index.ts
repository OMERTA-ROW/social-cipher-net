/**
 * Manual credential entry, connection status and disconnect.
 * Credentials are encrypted by the vault before they reach the database and are
 * never returned to the browser.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { putSecret } from "../_shared/connectorVault.ts";
import { audit, corsHeaders, json } from "../_shared/connectorEngine.ts";
import { getDefinition } from "../_shared/connectorManifest.ts";

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
      error: authError,
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const serviceId = String(body.service_id ?? "").slice(0, 64);

    /* -------------------------- list every connection ------------------- */
    if (action === "list") {
      const { data, error } = await admin
        .from("user_connections")
        .select(
          "id, service_id, status, method, health, account_name, account_handle, scopes, expires_at, last_synced_at, last_error, failure_count, connected_at, updated_at",
        )
        .eq("user_id", user.id);
      if (error) return json({ error: error.message }, 400);

      // Which credential names are stored, never the values themselves.
      const ids = (data ?? []).map((c) => c.id);
      const { data: secretRows } = ids.length
        ? await admin
          .from("connection_secrets")
          .select("connection_id, secret_type, expires_at")
          .in("connection_id", ids)
        : { data: [] };

      const connections = (data ?? []).map((c) => ({
        ...c,
        stored_credentials: (secretRows ?? [])
          .filter((s: { connection_id: string }) => s.connection_id === c.id)
          .map((s: { secret_type: string }) => s.secret_type),
      }));

      return json({ ok: true, connections });
    }

    if (!serviceId) return json({ error: "Missing service" }, 400);

    /* ------------------------------ save -------------------------------- */
    if (action === "save") {
      const definition = getDefinition(serviceId);
      const credentials = (body.credentials ?? {}) as Record<string, string>;
      const accountName =
        typeof body.account_name === "string"
          ? body.account_name.slice(0, 120)
          : null;

      const entries = Object.entries(credentials).filter(
        ([, v]) => typeof v === "string" && v.trim().length > 0,
      );
      if (entries.length === 0) {
        return json({ error: "No credentials provided" }, 400);
      }

      const { data: connection, error: connError } = await admin
        .from("user_connections")
        .upsert(
          {
            user_id: user.id,
            service_id: serviceId,
            method: definition?.methods.includes("app_password")
              ? "app_password"
              : "api_key",
            status: "connected",
            health: "healthy",
            failure_count: 0,
            account_name: accountName,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,service_id" },
        )
        .select("id")
        .single();

      if (connError || !connection) {
        return json({ error: connError?.message ?? "Could not save" }, 400);
      }

      for (const [key, value] of entries) {
        const failure = await putSecret(admin, {
          connectionId: connection.id,
          userId: user.id,
          type: key,
          value: String(value),
        });
        if (failure) return json({ error: failure }, 400);
      }

      await audit(admin, {
        userId: user.id,
        connectionId: connection.id,
        serviceId,
        action: "save_credentials",
        status: "ok",
        detail: `${entries.length} credential field(s) stored`,
      });

      return json({ ok: true, connection_id: connection.id });
    }

    /* --------------------------- disconnect ----------------------------- */
    if (action === "disconnect") {
      const { data: existing } = await admin
        .from("user_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();

      const { error } = await admin
        .from("user_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) return json({ error: error.message }, 400);

      await audit(admin, {
        userId: user.id,
        connectionId: null,
        serviceId,
        action: "disconnect",
        status: "ok",
        detail: existing ? "Connection and stored credentials removed" : "Nothing to remove",
      });

      return json({ ok: true });
    }

    /* ----------------------------- status ------------------------------- */
    if (action === "status") {
      const { data } = await admin
        .from("user_connections")
        .select(
          "id, service_id, status, method, health, account_name, scopes, expires_at, last_synced_at, last_error, updated_at",
        )
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();
      return json({ ok: true, connection: data ?? null });
    }

    /* ---------------------------- activity ------------------------------ */
    if (action === "activity") {
      const { data } = await admin
        .from("connector_audit_log")
        .select("id, service_id, action, status, http_status, detail, created_at")
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ ok: true, activity: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
