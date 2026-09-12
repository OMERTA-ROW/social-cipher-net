import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Send, X, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TheaterEvent } from "@/hooks/useTheaterEvents";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface TheaterRoomProps {
  event: TheaterEvent;
  userId: string | null;
  onClose: () => void;
}

/** Shared watch room: host drives playback, everyone else follows in sync. */
const TheaterRoom = ({ event, userId, onClose }: TheaterRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [username, setUsername] = useState("Viewer");
  const [isPlaying, setIsPlaying] = useState(false);
  const isHost = userId === event.host_id;

  // Who am I in chat
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const record = data as { display_name?: string; username?: string } | null;
        if (record) setUsername(record.display_name || record.username || "Viewer");
      });
  }, [userId]);

  // Register attendance so chat access is scoped to this event
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("theater_participants")
      .upsert(
        { event_id: event.id, user_id: userId, last_seen_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" },
      )
      .then(() => {
        if (!cancelled) setJoined(true);
      });
    return () => {
      cancelled = true;
    };
  }, [event.id, userId]);

  // Existing chat + live updates
  useEffect(() => {
    let cancelled = false;
    if (!joined) return;


    supabase
      .from("theater_chat")
      .select("id, username, message, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!cancelled) setMessages(((data ?? []) as ChatMessage[]).reverse());
      });

    const channel = supabase
      .channel(`theater-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "theater_chat",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          setMessages((m) => [...m.slice(-99), payload.new as ChatMessage]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "theater_playback_state",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          if (isHost) return;
          const state = payload.new as {
            position_seconds: number;
            is_playing: boolean;
          };
          const video = videoRef.current;
          if (!video) return;
          if (Math.abs(video.currentTime - state.position_seconds) > 1.5) {
            video.currentTime = state.position_seconds;
          }
          if (state.is_playing) video.play().catch(() => undefined);
          else video.pause();
          setIsPlaying(state.is_playing);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [event.id, isHost, joined]);

  // Join at the current position
  useEffect(() => {
    supabase
      .from("theater_playback_state")
      .select("position_seconds, is_playing")
      .eq("event_id", event.id)
      .maybeSingle()
      .then(({ data }) => {
        const video = videoRef.current;
        if (!data || !video) return;
        video.currentTime = Number(data.position_seconds ?? 0);
        setIsPlaying(Boolean(data.is_playing));
        if (data.is_playing) video.play().catch(() => undefined);
      });
  }, [event.id]);

  // Host keeps everyone aligned
  useEffect(() => {
    if (!isHost) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      supabase.from("theater_playback_state").upsert(
        {
          event_id: event.id,
          position_seconds: video.currentTime,
          is_playing: !video.paused,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isHost, event.id]);

  const hostToggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play().catch(() => undefined);
    else video.pause();
    setIsPlaying(!video.paused);
    await supabase.from("theater_playback_state").upsert(
      {
        event_id: event.id,
        position_seconds: video.currentTime,
        is_playing: !video.paused,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );
  };

  const send = async () => {
    if (!draft.trim() || !userId) return;
    const text = draft.trim().slice(0, 500);
    setDraft("");
    const { error } = await supabase.from("theater_chat").insert({
      event_id: event.id,
      user_id: userId,
      username,
      message: text,
    });
    if (error) toast.error("Message not sent");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {event.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {event.is_live && (
                <Badge variant="destructive" className="animate-pulse text-[10px]">
                  LIVE
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {isHost ? "You are hosting" : "Synced with the host"}
              </Badge>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Leave">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="aspect-video bg-muted/20 rounded-lg overflow-hidden">
          {event.video_url ? (
            <video
              ref={videoRef}
              src={event.video_url}
              className="w-full h-full"
              controls={isHost}
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              The host hasn't loaded the film yet.
            </div>
          )}
        </div>

        {isHost && event.video_url && (
          <Button onClick={hostToggle} className="mt-3 glow-primary">
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isPlaying ? "Pause for everyone" : "Play for everyone"}
          </Button>
        )}

        {event.description && (
          <p className="text-sm text-muted-foreground mt-3">{event.description}</p>
        )}
      </Card>

      <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 flex flex-col h-[420px] lg:h-auto">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Live chat
        </h3>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-primary font-medium">{m.username}</span>{" "}
                <span className="text-foreground break-words">{m.message}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No messages yet — say hello.
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={userId ? "Message the room" : "Sign in to chat"}
            disabled={!userId}
          />
          <Button size="icon" onClick={send} disabled={!userId} aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-3 p-4 bg-card/50 backdrop-blur border-primary/20">
        <h3 className="font-semibold mb-3">Comments</h3>
        <CommentsPanel
          subjectType="theater_event"
          subjectId={event.id}
          section="theater"
          title={event.title}
          live
        />
      </Card>
    </div>
  );
};

export default TheaterRoom;
