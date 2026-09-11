import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Heuristic scam/phishing screen. Held messages never reach the inbox. */
export function screenMessage(body: string): { blocked: boolean; reason?: string } {
  const text = body.toLowerCase();

  const moneyBait = [
    "guaranteed profit",
    "double your",
    "crypto giveaway",
    "free giveaway",
    "investment opportunity",
    "send me eth",
    "send btc",
    "seed phrase",
    "recovery phrase",
    "private key",
    "wallet validation",
    "validate your wallet",
    "sync your wallet",
    "claim your airdrop",
    "you have won",
    "gift card code",
    "western union",
    "cash app flip",
    "money flip",
  ];
  const credentialBait = [
    "verify your account",
    "account will be suspended",
    "confirm your password",
    "login here to avoid",
    "click here to restore",
    "copyright violation appeal",
    "your account has been flagged",
  ];

  for (const phrase of [...moneyBait, ...credentialBait]) {
    if (text.includes(phrase)) {
      return { blocked: true, reason: `Matched scam pattern: "${phrase}"` };
    }
  }

  // Shortened or lookalike links pushing users off-platform.
  const shorteners = /(bit\.ly|tinyurl\.com|t\.co\/|cutt\.ly|rb\.gy|is\.gd|shorturl\.at|rebrand\.ly)/i;
  const lookalike = /(cyberlink|instagram|facebook|paypal|coinbase|metamask)[a-z0-9-]*\.(?!social\b)[a-z]{2,}\b\/?/i;
  const hasLink = /https?:\/\//i.test(body);

  if (hasLink && shorteners.test(body)) {
    return { blocked: true, reason: "Shortened link in an unsolicited message" };
  }
  if (hasLink && lookalike.test(body) && !/cyberlink\.social/i.test(body)) {
    return { blocked: true, reason: "Link imitates a trusted brand" };
  }

  return { blocked: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await anon.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const payload = await req.json().catch(() => null);
    const threadId = payload?.threadId;
    const body = payload?.body;
    if (typeof threadId !== "string" || typeof body !== "string") {
      return json({ error: "threadId and body are required" }, 400);
    }
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 5000) {
      return json({ error: "Message must be between 1 and 5000 characters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: participants, error: partError } = await admin
      .from("dm_participants")
      .select("user_id")
      .eq("thread_id", threadId);
    if (partError) throw partError;

    const memberIds = (participants ?? []).map((p) => p.user_id);
    if (!memberIds.includes(user.id)) return json({ error: "Not a member of this thread" }, 403);

    // Rate limit: 30 messages a minute per sender.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("dm_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 30) return json({ error: "Slow down — too many messages" }, 429);

    // Blocks are account-level and mutual in effect.
    const others = memberIds.filter((id) => id !== user.id);
    if (others.length > 0) {
      const { data: blocks } = await admin
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.in.(${others.join(",")})),and(blocked_id.eq.${user.id},blocker_id.in.(${others.join(",")}))`,
        );
      if ((blocks ?? []).length > 0) {
        return json({ error: "You cannot message this account" }, 403);
      }
    }

    const screen = screenMessage(trimmed);

    const { data: message, error: insertError } = await admin
      .from("dm_messages")
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        body: trimmed,
        source_platform: "cyberlink",
        is_filtered: screen.blocked,
        filter_reason: screen.reason ?? null,
      })
      .select("id, created_at")
      .single();
    if (insertError) throw insertError;

    if (screen.blocked) {
      await admin.from("moderation_reviews").insert({
        subject_type: "direct_message",
        subject_id: message.id,
        subject_user_id: user.id,
        reason: "Automatic scam/phishing screen",
        details: { filter_reason: screen.reason, thread_id: threadId },
        severity: "medium",
        status: "pending",
      });
      return json({
        delivered: false,
        held: true,
        reason: "This message looks like a scam and was held for review.",
      });
    }

    return json({ delivered: true, messageId: message.id });
  } catch (error) {
    console.error("send-direct-message error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
