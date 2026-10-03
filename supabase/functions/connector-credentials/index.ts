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
          "id, service_id, account_key, account_label, is_active_account, status, method, health, account_name, account_handle, scopes, expires_at, last_synced_at, last_error, failure_count, connected_at, updated_at",
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
      if (serviceId.startsWith("acct:")) {
        return json({ error: "This account must be connected through the provider's sign-in, not pasted keys." }, 400);
      }
      const accountKey = String(body.account_key ?? "default").slice(0, 64) || "default";
      // User-typed names are labels only, never a verified provider identity.
      const accountLabel =
        typeof body.account_label === "string"
          ? body.account_label.slice(0, 120)
          : typeof body.account_name === "string" ? body.account_name.slice(0, 120) : null;

      const entries = Object.entries(credentials).filter(
        ([, v]) => typeof v === "string" && v.trim().length > 0,
      );
      if (entries.length === 0) {
        return json({ error: "No credentials provided" }, 400);
      }

      // Never overwrite a working connection's secrets in place; a failed write
      // would destroy the previous verified credentials.
      const { data: existing } = await admin
        .from("user_connections")
        .select("id, status, method")
        .eq("user_id", user.id).eq("service_id", serviceId).eq("account_key", accountKey)
        .maybeSingle();
      if (existing?.status === "connected") {
        return json({ error: "This account is already connected. Disconnect it first, or add it under a new account name." }, 409);
      }

      // Saved as pending/unverified: manual keys are never shown as Connected
      // until a server-side provider check verifies them.
      const { data: connection, error: connError } = await admin
        .from("user_connections")
        .upsert(
          {
            user_id: user.id,
            service_id: serviceId,
            account_key: accountKey,
            account_label: accountLabel,
            account_name: null,
            provider_account_id: null,
            method: definition?.methods.includes("app_password") ? "app_password" : "api_key",
            status: "pending",
            health: "unverified",
            failure_count: 0,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,service_id,account_key" },
        )
        .select("id")
        .single();

      if (connError || !connection) {
        return json({ error: "Could not save" }, 400);
      }

      for (const [key, value] of entries) {
        const failure = await putSecret(admin, {
          connectionId: connection.id,
          userId: user.id,
          type: key,
          value: String(value),
        });
        if (failure) {
          await admin.from("connection_secrets").delete().eq("connection_id", connection.id);
          await admin.from("user_connections").delete().eq("id", connection.id).eq("user_id", user.id);
          return json({ error: failure }, 400);
        }
      }

      await audit(admin, {
        userId: user.id,
        connectionId: connection.id,
        serviceId,
        action: "save_credentials",
        status: "ok",
        detail: `${entries.length} credential field(s) stored, pending verification`,
      });

      return json({ ok: true, connection_id: connection.id, status: "pending" });
    }

    /* --------------------------- disconnect ----------------------------- */
    if (action === "disconnect") {
      // A single linked account when an id is given, otherwise every account
      // this member has for the service.
      const connectionId = typeof body.connection_id === "string" ? body.connection_id : null;
      let query = admin
        .from("user_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (connectionId) query = query.eq("id", connectionId);
      const { data: existing } = await query;

      let del = admin
        .from("user_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (connectionId) del = del.eq("id", connectionId);
      const { error } = await del;
      if (error) return json({ error: error.message }, 400);

      await audit(admin, {
        userId: user.id,
        connectionId: null,
        serviceId,
        action: "disconnect",
        status: "ok",
        detail: existing?.length
          ? `${existing.length} linked account(s) and their stored credentials removed`
          : "Nothing to remove",
      });

      return json({ ok: true });
    }

    /* ------------------- choose the active account ---------------------- */
    if (action === "set_active") {
      const connectionId = String(body.connection_id ?? "");
      if (!connectionId) return json({ error: "Missing account" }, 400);

      // Ownership is re-checked on the server; the browser only sends an id.
      const { data: target } = await admin
        .from("user_connections")
        .select("id")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();
      if (!target) return json({ error: "Account not found" }, 404);

      await admin
        .from("user_connections")
        .update({ is_active_account: false })
        .eq("user_id", user.id)
        .eq("service_id", serviceId);

      const { error } = await admin
        .from("user_connections")
        .update({ is_active_account: true })
        .eq("id", connectionId)
        .eq("user_id", user.id);
      if (error) return json({ error: error.message }, 400);

      await audit(admin, {
        userId: user.id,
        connectionId,
        serviceId,
        action: "set_active_account",
        status: "ok",
      });
      return json({ ok: true });
    }

    /* -------------------------- rename an account ----------------------- */
    if (action === "rename") {
      const connectionId = String(body.connection_id ?? "");
      const label = typeof body.account_label === "string" ? body.account_label.slice(0, 120) : null;
      if (!connectionId) return json({ error: "Missing account" }, 400);

      const { error } = await admin
        .from("user_connections")
        .update({ account_label: label })
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    /* ----------------------------- status ------------------------------- */
    if (action === "status") {
      const { data } = await admin
        .from("user_connections")
        .select(
          "id, service_id, account_key, account_label, is_active_account, status, method, health, account_name, scopes, expires_at, last_synced_at, last_error, updated_at",
        )
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .order("is_active_account", { ascending: false })
        .limit(1);
      return json({ ok: true, connection: data?.[0] ?? null });
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
