import { supabase } from "@/integrations/supabase/client";

export interface InboxMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_label: string | null;
  body: string;
  source_platform: string;
  created_at: string;
}

export interface InboxThread {
  id: string;
  title: string | null;
  source_platform: string;
  last_message_at: string;
  is_private: boolean;
  tags: string[];
  last_read_at: string;
  unread: number;
  lastMessage: InboxMessage | null;
  counterpart: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

/** Platform badge for the unified inbox. */
export const platformLabel = (key: string) =>
  ({
    cyberlink: "Cyber Link",
    instagram: "Instagram",
    x: "X",
    twitter: "X",
    facebook: "Facebook",
    tiktok: "TikTok",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    discord: "Discord",
    twitch: "Twitch",
    reddit: "Reddit",
  })[key] ?? key;

/** One unified stream of threads across Cyber Link and connected accounts. */
export async function fetchInbox(userId: string): Promise<InboxThread[]> {
  const { data: participantRows, error } = await supabase
    .from("dm_participants")
    .select("thread_id, last_read_at, is_private, tags")
    .eq("user_id", userId)
    .eq("is_archived", false);
  if (error) throw error;

  const threadIds = (participantRows ?? []).map((r) => r.thread_id);
  if (threadIds.length === 0) return [];

  const [{ data: threads }, { data: messages }, { data: others }] = await Promise.all([
    supabase
      .from("dm_threads")
      .select("id, title, source_platform, last_message_at")
      .in("id", threadIds),
    supabase
      .from("dm_messages")
      .select("id, thread_id, sender_id, sender_label, body, source_platform, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("dm_participants")
      .select("thread_id, user_id")
      .in("thread_id", threadIds)
      .neq("user_id", userId),
  ]);

  const counterpartIds = Array.from(new Set((others ?? []).map((o) => o.user_id)));
  const profileMap = new Map<string, any>();
  if (counterpartIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", counterpartIds);
    (profiles ?? []).forEach((p) => profileMap.set(p.id, p));
  }

  const byThread = new Map<string, InboxMessage[]>();
  (messages ?? []).forEach((m) => {
    const list = byThread.get(m.thread_id) ?? [];
    list.push(m as InboxMessage);
    byThread.set(m.thread_id, list);
  });

  const meta = new Map((participantRows ?? []).map((r) => [r.thread_id, r]));

  return (threads ?? [])
    .map((t) => {
      const m = meta.get(t.id)!;
      const list = byThread.get(t.id) ?? [];
      const lastRead = new Date(m.last_read_at).getTime();
      const counterpartId = (others ?? []).find((o) => o.thread_id === t.id)?.user_id;
      return {
        id: t.id,
        title: t.title,
        source_platform: t.source_platform,
        last_message_at: t.last_message_at,
        is_private: m.is_private,
        tags: m.tags ?? [],
        last_read_at: m.last_read_at,
        unread: list.filter(
          (msg) => msg.sender_id !== userId && new Date(msg.created_at).getTime() > lastRead,
        ).length,
        lastMessage: list[0] ?? null,
        counterpart: counterpartId ? (profileMap.get(counterpartId) ?? null) : null,
      };
    })
    .sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
}

export async function fetchMessages(threadId: string): Promise<InboxMessage[]> {
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, thread_id, sender_id, sender_label, body, source_platform, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as InboxMessage[];
}

export async function sendMessage(threadId: string, body: string) {
  const { data, error } = await supabase.functions.invoke("send-direct-message", {
    body: { threadId, body },
  });
  if (error) throw error;
  return data as { delivered: boolean; held?: boolean; reason?: string };
}

export async function markRead(threadId: string, userId: string) {
  await supabase
    .from("dm_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", userId);
}

export async function setThreadPrivate(threadId: string, userId: string, isPrivate: boolean) {
  const { error } = await supabase
    .from("dm_participants")
    .update({ is_private: isPrivate })
    .eq("thread_id", threadId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setThreadTags(threadId: string, userId: string, tags: string[]) {
  const { error } = await supabase
    .from("dm_participants")
    .update({ tags })
    .eq("thread_id", threadId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function blockAccount(blockedId: string, reason?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first");
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id: blockedId, reason: reason ?? null });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function reportMessage(messageId: string, reason: string, subjectUserId?: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first");
  const { error } = await supabase.from("moderation_reviews").insert({
    subject_type: "direct_message",
    subject_id: messageId,
    reported_by: user.id,
    subject_user_id: subjectUserId ?? null,
    reason,
    severity: "medium",
    status: "pending",
  });
  if (error) throw error;
}

/** Starts (or reuses) a one-to-one thread with another account. */
export async function startThread(otherUserId: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first");

  const { data: mine } = await supabase
    .from("dm_participants")
    .select("thread_id")
    .eq("user_id", user.id);
  const myThreads = (mine ?? []).map((r) => r.thread_id);
  if (myThreads.length > 0) {
    const { data: shared } = await supabase
      .from("dm_participants")
      .select("thread_id")
      .eq("user_id", otherUserId)
      .in("thread_id", myThreads)
      .limit(1);
    if (shared && shared.length > 0) return shared[0].thread_id;
  }

  const { data: thread, error } = await supabase
    .from("dm_threads")
    .insert({ created_by: user.id, source_platform: "cyberlink" })
    .select("id")
    .single();
  if (error) throw error;

  const { error: partError } = await supabase.from("dm_participants").insert([
    { thread_id: thread.id, user_id: user.id },
    { thread_id: thread.id, user_id: otherUserId },
  ]);
  if (partError) throw partError;

  return thread.id;
}
