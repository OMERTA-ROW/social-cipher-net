import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const meta = (html: string, names: string[]): string | null => {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    );
    const m = html.match(re) ?? html.match(alt);
    if (m?.[1]) return m[1].trim();
  }
  return null;
};

const decode = (s: string | null) =>
  s
    ? s
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .slice(0, 500)
    : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json().catch(() => ({ url: null }));
    if (typeof url !== "string" || url.length > 2048) return json({ error: "Invalid url" }, 400);

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return json({ error: "Invalid url" }, 400);
    }
    // Only public web links; never let this reach internal hosts.
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return json({ error: "Unsupported protocol" }, 400);
    }
    const host = target.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.test(host) ||
      host.includes(":")
    ) {
      return json({ error: "Blocked host" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cached } = await admin
      .from("link_previews")
      .select("url, title, description, image_url, site_name, media_kind, embed_url, fetched_at")
      .eq("url", url)
      .maybeSingle();

    const fresh =
      cached && Date.now() - new Date(cached.fetched_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    if (fresh) return json({ preview: cached });

    let html = "";
    let contentType = "";
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "CyberLinkBot/1.0 (+link preview)" },
        signal: AbortSignal.timeout(8000),
      });
      contentType = res.headers.get("content-type") ?? "";
      if (contentType.startsWith("text/html")) {
        html = (await res.text()).slice(0, 400_000);
      }
    } catch (_e) {
      // Unreachable link: fall through to a minimal card.
    }

    const isImage = contentType.startsWith("image/");
    const isVideo = contentType.startsWith("video/");

    const preview = {
      url,
      title: decode(meta(html, ["og:title", "twitter:title"])) ??
        decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null) ??
        target.hostname,
      description: decode(meta(html, ["og:description", "twitter:description", "description"])),
      image_url: isImage ? url : decode(meta(html, ["og:image", "twitter:image"])),
      site_name: decode(meta(html, ["og:site_name"])) ?? target.hostname.replace(/^www\./, ""),
      media_kind: isImage ? "image" : isVideo ? "video" : "link",
      embed_url: isImage || isVideo ? url : decode(meta(html, ["og:video:url", "og:video"])),
      fetched_at: new Date().toISOString(),
    };

    await admin.from("link_previews").upsert(preview, { onConflict: "url" });

    return json({ preview });
  } catch (error) {
    console.error("link-preview error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
