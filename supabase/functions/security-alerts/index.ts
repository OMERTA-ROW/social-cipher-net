import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EVENTS = new Set([
  "post_payments_permission_denied",
  "post_payments_check_failed",
  "feed_load_failed",
  "stories_load_failed",
  "rls_policy_failure",
]);

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null } };

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "report";

    // ---- Client-side failure report (permission denied / RLS rejection) ----
    if (action === "report") {
      const eventType = String(body.event_type ?? "");
      if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "Unknown event type" }, 400);

      const severity = eventType.includes("permission_denied") ? "high" : "medium";

      const { error } = await admin.from("security_audit_log").insert({
        user_id: user?.id ?? null,
        event_type: eventType,
        severity,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        metadata: {
          source: "client",
          message: String(body.message ?? "").slice(0, 500),
          path: String(body.path ?? "").slice(0, 200),
          detail: typeof body.detail === "object" && body.detail !== null
            ? JSON.parse(JSON.stringify(body.detail).slice(0, 2000))
            : null,
        },
      });
      if (error) throw error;
      return json({ recorded: true });
    }

    // ---- Alert digest (admins only) ----
    if (action === "digest") {
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Admin access required" }, 403);

      const windowMinutes = Math.min(Number(body.window_minutes ?? 60) || 60, 1440);
      const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

      const { data: events, error } = await admin
        .from("security_audit_log")
        .select("event_type, severity, created_at, user_id, metadata")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of events ?? []) {
        counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
      }

      const permissionDenials = (events ?? []).filter((e) =>
        e.event_type.includes("permission_denied") || e.event_type === "rls_policy_failure"
      ).length;
      const escalationAttempts = (events ?? []).filter((e) =>
        e.event_type === "stream_privilege_self_assign_blocked" ||
        e.event_type === "protected_record_owner_change_blocked"
      ).length;

      return json({
        window_minutes: windowMinutes,
        since,
        counts,
        permission_denials: permissionDenials,
        escalation_attempts: escalationAttempts,
        alert: permissionDenials > 0 || escalationAttempts > 0,
        recent: (events ?? []).slice(0, 50),
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("security-alerts error", error);
    return json({ error: (error as Error).message ?? "Operation failed" }, 500);
  }
});
