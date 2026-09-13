import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MegaChat } from "@/components/MegaChat";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { endLiveStream, joinLiveStream, LiveStreamRecord } from "@/lib/live";
import { displayNameOf, SocialProfile } from "@/lib/social";
import CommentsPanel from "@/components/comments/CommentsPanel";

/**
 * The room a live post opens into. Shows the host, whether the stream is
 * still running, live chat and the comment thread. Nothing is simulated: if
 * the host is not sending video yet, that is what it says.
 */
const LiveRoom = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [host, setHost] = useState<SocialProfile | null>(null);
  const [viewers, setViewers] = useState(0);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamId) return;
    let alive = true;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (alive) setMeId(user?.id ?? null);

        const { data, error } = await supabase
          .from("live_streams")
          .select("id, user_id, title, description, section, is_live, started_at, ended_at, viewer_count")
          .eq("id", streamId)
          .maybeSingle();
        if (!alive) return;
        if (error || !data) return;
        setStream(data as LiveStreamRecord);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified")
          .eq("id", data.user_id)
          .maybeSingle();
        if (alive) setHost((profile as SocialProfile) ?? null);

        if (user) await joinLiveStream(streamId).catch(() => undefined);

        const { count } = await supabase
          .from("live_stream_participants")
          .select("id", { count: "exact", head: true })
          .eq("stream_id", streamId)
          .eq("is_active", true);
        if (alive) setViewers(count ?? 0);
      } catch (error) {
        console.error("Could not open the live room:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`live-room-${streamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
        (payload) => setStream((prev) => ({ ...(prev as LiveStreamRecord), ...(payload.new as any) })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_stream_participants", filter: `stream_id=eq.${streamId}` },
        async () => {
          const { count } = await supabase
            .from("live_stream_participants")
            .select("id", { count: "exact", head: true })
            .eq("stream_id", streamId)
            .eq("is_active", true);
          setViewers(count ?? 0);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const isHost = !!meId && stream?.user_id === meId;

  const stop = async () => {
    if (!stream) return;
    try {
      await endLiveStream(stream.id);
      toast.success("Live ended");
    } catch (error: any) {
      toast.error(error.message || "Could not end the live");
    }
  };

  return (
    <AppShell
      title={stream?.title || "Live Room"}
      description="Watch the live session and join its conversation."
    >
      <div className="space-y-4">
        {loading ? (
          <Card className="p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </Card>
        ) : !stream ? (
          <Card className="p-10 text-center text-muted-foreground">This live no longer exists.</Card>
        ) : (
          <>
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {host && (
                  <PresenceAvatar
                    src={host.avatar_url ?? undefined}
                    name={displayNameOf(host)}
                    size={44}
                    isLive={!!stream.is_live}
                  />
                )}
                <div className="min-w-0 flex-1">
                  {host && (
                    <Link to={`/profile/${host.id}`} className="text-sm text-muted-foreground hover:text-primary">
                      {displayNameOf(host)} @{host.username ?? "member"}
                    </Link>
                  )}
                </div>
                {stream.is_live ? (
                  <Badge className="gap-1 bg-primary/20 text-primary border border-primary/40">
                    <Radio className="w-3 h-3" /> LIVE
                  </Badge>
                ) : (
                  <Badge variant="outline">Ended</Badge>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" /> {viewers}
                </span>
                {isHost && stream.is_live && (
                  <Button size="sm" variant="outline" onClick={stop}>
                    End live
                  </Button>
                )}
              </div>

              {stream.description && <p className="text-sm text-muted-foreground">{stream.description}</p>}

              <div className="aspect-video rounded-lg border border-border/60 bg-background/60 flex items-center justify-center text-center px-6">
                <p className="text-sm text-muted-foreground">
                  {stream.is_live
                    ? isHost
                      ? "Your room is open. Send your video from Studio to start broadcasting here."
                      : "The host has opened the room. Video appears here once they start sending it."
                    : "This live has ended."}
                </p>
              </div>

              {isHost && stream.is_live && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/studio?tab=broadcast&section=${encodeURIComponent(stream.section)}`}>Open Studio to broadcast</Link>
                </Button>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <MegaChat streamId={stream.id} />
              <Card className="p-4">
                <h2 className="text-sm font-semibold mb-2">Comments</h2>
                <CommentsPanel subjectType="live_stream" subjectId={stream.id} section={stream.section} />
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default LiveRoom;
