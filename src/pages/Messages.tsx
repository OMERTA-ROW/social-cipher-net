import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MoreVertical, Send, ShieldAlert, Lock, Tag } from "lucide-react";
import {
  InboxMessage,
  InboxThread,
  blockAccount,
  fetchInbox,
  fetchMessages,
  markRead,
  platformLabel,
  reportMessage,
  sendMessage,
  setThreadPrivate,
  setThreadTags,
} from "@/lib/messaging";
import NewConversationDialog from "@/components/messages/NewConversationDialog";

const Messages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const loadInbox = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await fetchInbox(userId);
      setThreads(list);
      setActiveId((current) => current ?? list[0]?.id ?? null);
    } catch (error: any) {
      toast.error(error.message || "Could not load your inbox");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadInbox();
  }, [userId, loadInbox]);

  // Live messages across every thread the user is in.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("dm-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload) => {
          const msg = payload.new as InboxMessage & { is_filtered?: boolean };
          if (msg.is_filtered) return;
          setMessages((prev) =>
            msg.thread_id === activeId && !prev.some((m) => m.id === msg.id)
              ? [...prev, msg]
              : prev,
          );
          loadInbox();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeId, loadInbox]);

  useEffect(() => {
    if (!activeId || !userId) return;
    let active = true;
    (async () => {
      try {
        const list = await fetchMessages(activeId);
        if (!active) return;
        setMessages(list);
        await markRead(activeId, userId);
        setThreads((prev) => prev.map((t) => (t.id === activeId ? { ...t, unread: 0 } : t)));
      } catch (error: any) {
        toast.error(error.message || "Could not open this conversation");
      }
    })();

    const channel = supabase
      .channel(`dm-typing-${activeId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId && payload.userId !== userId) {
          setPeerTyping(true);
          setTimeout(() => setPeerTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannel.current = channel;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [activeId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const onDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (typingChannel.current && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      typingChannel.current.send({ type: "broadcast", event: "typing", payload: { userId } });
    }
  };

  const submit = async () => {
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendMessage(activeId, draft);
      if (result?.held) {
        toast.warning(result.reason || "Message held for review");
      } else {
        const list = await fetchMessages(activeId);
        setMessages(list);
      }
      setDraft("");
      loadInbox();
    } catch (error: any) {
      toast.error(error.message || "Could not send your message");
    } finally {
      setSending(false);
    }
  };

  const togglePrivate = async () => {
    if (!activeThread || !userId) return;
    try {
      await setThreadPrivate(activeThread.id, userId, !activeThread.is_private);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, is_private: !t.is_private } : t)),
      );
    } catch (error: any) {
      toast.error(error.message || "Could not update this conversation");
    }
  };

  const addTag = async () => {
    if (!activeThread || !userId) return;
    const tag = window.prompt("Tag this conversation");
    if (!tag?.trim()) return;
    const tags = Array.from(new Set([...activeThread.tags, tag.trim()]));
    try {
      await setThreadTags(activeThread.id, userId, tags);
      setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? { ...t, tags } : t)));
    } catch (error: any) {
      toast.error(error.message || "Could not tag this conversation");
    }
  };

  const block = async () => {
    if (!activeThread?.counterpart) return;
    try {
      await blockAccount(activeThread.counterpart.id);
      toast.success("Account blocked");
      loadInbox();
    } catch (error: any) {
      toast.error(error.message || "Could not block this account");
    }
  };

  const report = async (messageId: string) => {
    const reason = window.prompt("What's wrong with this message?");
    if (!reason?.trim()) return;
    try {
      await reportMessage(messageId, reason.trim(), activeThread?.counterpart?.id ?? null);
      toast.success("Sent to a human reviewer");
    } catch (error: any) {
      toast.error(error.message || "Could not report this message");
    }
  };

  if (!userId && !loading) {
    return (
      <AppShell>
        <Card className="p-8 text-center bg-background/80 border-border/50">
          <h2 className="text-xl font-semibold mb-2">Messages</h2>
          <p className="text-muted-foreground">Sign in to see your inbox.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,32%)_1fr]">
        <Card className="p-3 bg-background/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <h2 className="text-lg font-semibold">Inbox</h2>
            <Button size="sm" className="gap-1" onClick={() => setComposeOpen(true)}>
              <Send className="h-3 w-3" /> New
            </Button>
          </div>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Every connected account in one stream.
          </p>
          <NewConversationDialog
            open={composeOpen}
            onOpenChange={setComposeOpen}
            currentUserId={userId}
            onStarted={(threadId) => {
              loadInbox();
              setActiveId(threadId);
            }}
          />
          <ScrollArea className="h-[60vh]">
            {loading ? (
              <div className="p-4 text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : threads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul className="space-y-1">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left rounded-lg p-3 transition-colors ${
                        t.id === activeId ? "bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={t.counterpart?.avatar_url || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback>
                            {(t.counterpart?.display_name || t.title || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {t.counterpart?.display_name ||
                                t.counterpart?.username ||
                                t.title ||
                                "Conversation"}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {platformLabel(t.source_platform)}
                            </Badge>
                            {t.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.lastMessage?.body || "No messages yet"}
                          </p>
                        </div>
                        {t.unread > 0 && (
                          <Badge className="h-5 min-w-5 justify-center px-1">{t.unread}</Badge>
                        )}
                      </div>
                      {t.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        <Card className="p-4 bg-background/80 backdrop-blur-sm border-border/50 flex flex-col min-h-[60vh]">
          {!activeThread ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Pick a conversation.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {activeThread.counterpart?.display_name ||
                      activeThread.counterpart?.username ||
                      activeThread.title ||
                      "Conversation"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {platformLabel(activeThread.source_platform)}
                    {peerTyping && " · typing…"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={togglePrivate}>
                      <Lock className="h-4 w-4 mr-2" />
                      {activeThread.is_private ? "Unmark private" : "Mark private"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={addTag}>
                      <Tag className="h-4 w-4 mr-2" /> Add tag
                    </DropdownMenuItem>
                    {activeThread.counterpart && (
                      <DropdownMenuItem onClick={block} className="text-destructive">
                        <ShieldAlert className="h-4 w-4 mr-2" /> Block account
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ScrollArea className="flex-1 py-4">
                <div className="space-y-3 pr-2">
                  {messages.map((m) => {
                    const mine = m.sender_id === userId;
                    return (
                      <div
                        key={m.id}
                        className={`group flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            mine ? "bg-primary/15" : "bg-muted/50"
                          }`}
                        >
                          {!mine && m.source_platform !== "cyberlink" && (
                            <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                              {platformLabel(m.source_platform)}
                              {m.sender_label ? ` · ${m.sender_label}` : ""}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          {!mine && (
                            <button
                              onClick={() => report(m.id)}
                              className="mt-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                <Input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Write a message…"
                />
                <Button onClick={submit} disabled={sending || !draft.trim()} className="gap-2">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default Messages;
