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

interface RemoteItem {
  external_id: string;
  name: string;
  asset_type: string;
  url: string;
  thumbnail?: string;
}

const listCanva = async (token: string): Promise<RemoteItem[]> => {
  const res = await fetch("https://api.canva.com/rest/v1/designs?limit=30", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Canva rejected the request");
  const data = await res.json();
  return (data.items ?? []).map((d: Record<string, unknown>) => ({
    external_id: String(d.id),
    name: String((d.title as string) ?? "Untitled design"),
    asset_type: "image",
    url: String(
      ((d.urls as Record<string, string>) ?? {}).view_url ??
        ((d.thumbnail as Record<string, string>) ?? {}).url ??
        "",
    ),
    thumbnail: ((d.thumbnail as Record<string, string>) ?? {}).url,
  }));
};

const listAdobe = async (token: string): Promise<RemoteItem[]> => {
  const res = await fetch(
    "https://cc-api-storage.adobe.io/api/v1/assets?limit=30",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error("Adobe rejected the request");
  const data = await res.json();
  return (data.children ?? data.items ?? []).map(
    (d: Record<string, unknown>) => ({
      external_id: String(d.id ?? d.asset_id ?? crypto.randomUUID()),
      name: String(d.name ?? "Adobe asset"),
      asset_type: String(d.type ?? "image").includes("video") ? "video" : "image",
      url: String(d.rendition ?? d.path ?? ""),
    }),
  );
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
    const serviceId = String(body.service_id ?? "");
    const action = String(body.action ?? "list");

    const { data: connection } = await admin
      .from("user_connections")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (!connection || connection.status !== "connected") {
      return json({ error: "Connect this account first" }, 400);
    }

    const { data: secretRows } = await admin
      .from("connection_secrets")
      .select("secret_type, secret_value")
      .eq("connection_id", connection.id);

    const token = (secretRows ?? []).find(
      (r) => r.secret_type === "access_token" || r.secret_type === "api_key",
    )?.secret_value as string | undefined;

    if (!token) return json({ error: "This connection has no token" }, 400);

    let items: RemoteItem[] = [];
    try {
      if (serviceId === "canva") items = await listCanva(token);
      else if (serviceId === "adobe") items = await listAdobe(token);
      else return json({ error: "Importing is not supported for this service" }, 400);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Could not reach the service" },
        502,
      );
    }

    if (action === "list") return json({ ok: true, items });

    if (action === "import") {
      const wanted = new Set(
        (Array.isArray(body.external_ids) ? body.external_ids : []).map(String),
      );
      const chosen = items.filter((i) => wanted.has(i.external_id) && i.url);
      if (chosen.length === 0) return json({ error: "Nothing selected" }, 400);

      const rows = chosen.map((i) => ({
        user_id: user.id,
        name: i.name.slice(0, 160),
        asset_type: i.asset_type,
        url: i.url,
        source: serviceId,
        metadata: { external_id: i.external_id, thumbnail: i.thumbnail ?? null },
      }));

      const { error } = await admin.from("studio_assets").insert(rows);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, imported: rows.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
