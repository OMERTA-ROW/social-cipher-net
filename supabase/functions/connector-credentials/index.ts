import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    if (!serviceId) return json({ error: "Missing service" }, 400);

    if (action === "save") {
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
            method: "api_key",
            status: "connected",
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
        const { error: secretError } = await admin
          .from("connection_secrets")
          .upsert(
            {
              connection_id: connection.id,
              user_id: user.id,
              secret_type: key.slice(0, 64),
              secret_value: String(value).slice(0, 8000),
            },
            { onConflict: "connection_id,secret_type" },
          );
        if (secretError) return json({ error: secretError.message }, 400);
      }

      return json({ ok: true, connection_id: connection.id });
    }

    if (action === "disconnect") {
      const { error } = await admin
        .from("user_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "status") {
      const { data } = await admin
        .from("user_connections")
        .select("id, service_id, status, method, account_name, updated_at")
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();
      return json({ ok: true, connection: data ?? null });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
