import { supabase } from "@/integrations/supabase/client";

export interface LiveStreamRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  section: string;
  is_live: boolean | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number | null;
}

/**
 * Starts a live stream for the signed-in user in one section and announces it
 * in that section's feed, so followers reach the live straight from the feed.
 * Live is per section: a Trading live is separate from a Studio live.
 */
export async function startLiveStream(input: {
  title: string;
  description?: string;
  section: string;
  communitySlug?: string | null;
}): Promise<{ streamId: string; postId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to go live");

  const title = input.title.trim();
  if (!title) throw new Error("Give your live a title");

  // One live per section per person: reuse an open one instead of stacking.
  const { data: existing } = await supabase
    .from("live_streams")
    .select("id")
    .eq("user_id", user.id)
    .eq("section", input.section)
    .eq("is_live", true)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from("live_streams").update({ title }).eq("id", existing.id);
  }

  let streamId = existing?.id as string | undefined;
  if (!streamId) {
    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        user_id: user.id,
        title,
        description: input.description?.trim() || null,
        section: input.section,
        is_live: true,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    streamId = data.id as string;

    // The host joins their own room as participant and admin.
    await supabase.from("live_stream_participants").insert({
      stream_id: streamId,
      user_id: user.id,
      is_host: true,
      is_admin: true,
      is_active: true,
    });
  }

  // Announce it as a normal post so it lands in the feed like anything else.
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: title,
      section: input.section,
      community_slug: input.communitySlug ?? null,
      subject_type: "live_stream",
      subject_id: streamId,
      monetization_type: "free",
      price: 0,
    })
    .select("id")
    .single();
  if (postError) throw postError;

  return { streamId, postId: post.id as string };
}

/** Ends a live stream. Only the host's own rows are writable under RLS. */
export async function endLiveStream(streamId: string): Promise<void> {
  const { error } = await supabase
    .from("live_streams")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("id", streamId);
  if (error) throw error;
}

/** Marks the signed-in viewer as present in a room (idempotent enough for UI). */
export async function joinLiveStream(streamId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase
    .from("live_stream_participants")
    .select("id")
    .eq("stream_id", streamId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from("live_stream_participants").update({ is_active: true }).eq("id", existing.id);
    return;
  }
  await supabase.from("live_stream_participants").insert({
    stream_id: streamId,
    user_id: user.id,
    is_host: false,
    is_admin: false,
    is_active: true,
  });
}
