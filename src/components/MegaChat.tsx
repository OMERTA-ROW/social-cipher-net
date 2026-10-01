import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { useLivePresence } from "@/hooks/useLivePresence";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Send, Users, Youtube, Facebook, Instagram, Video } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  platform: string;
  username: string;
  message: string;
  user_avatar?: string;
  created_at: string;
  user_id?: string;
}

interface MegaChatProps {
  streamId: string;
}

export function MegaChat({ streamId }: MegaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveIds = useLivePresence(messages.flatMap((message) => message.user_id ? [message.user_id] : []));

  useEffect(() => {
    loadMessages();
    loadConnectedPlatforms();
    const messageChannel = setupRealtimeSubscription();
    const platformChannel = setupPlatformConnectionsSubscription();
    
    return () => {
      messageChannel();
      platformChannel();
    };
  }, [streamId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("stream_chat_messages")
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to load messages:", error);
      return;
    }

    if (data) {
      setMessages(data);
    }
  };

  const loadConnectedPlatforms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_connections")
      .select("service_id")
      .eq("user_id", user.id)
      .eq("status", "connected");

    if (error) {
      console.error("Failed to load platforms:", error);
      return;
    }

    if (data) {
      setConnectedPlatforms(data.map(p => p.service_id));
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`mega-chat-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_chat_messages",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupPlatformConnectionsSubscription = () => {
    const channel = supabase
      .channel('user-connections-updates')
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_connections",
        },
        () => {
          loadConnectedPlatforms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to send messages");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("stream_chat_messages").insert({
      stream_id: streamId,
      platform: "cyberlink",
      username: profile?.username || "Anonymous",
      message: newMessage,
      user_avatar: profile?.avatar_url,
    });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
      return;
    }

    setNewMessage("");
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return <Youtube className="w-3 h-3" />;
      case "facebook":
        return <Facebook className="w-3 h-3" />;
      case "instagram":
        return <Instagram className="w-3 h-3" />;
      case "tiktok":
        return <Video className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return "bg-red-500";
      case "facebook":
        return "bg-blue-500";
      case "instagram":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "tiktok":
        return "bg-black";
      case "twitter":
        return "bg-sky-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-background/95 backdrop-blur border-primary/20">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Mega Chat</h3>
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
          <div className="flex gap-1">
            {connectedPlatforms.map((platform) => (
              <Badge
                key={platform}
                variant="outline"
                className={`${getPlatformColor(platform)} text-white border-0 text-xs`}
              >
                {getPlatformIcon(platform)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 group border border-transparent hover:border-primary hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.35)] p-2 rounded-lg transition-colors">
              <div className="relative shrink-0">
                <PresenceAvatar src={msg.user_avatar} name={msg.username} size={32} isLive={Boolean(msg.user_id && liveIds.has(msg.user_id))} showBadge={false} />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getPlatformColor(msg.platform)} flex items-center justify-center border-2 border-background`}>
                  {getPlatformIcon(msg.platform)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${getPlatformColor(msg.platform)}`}>
                    {getPlatformIcon(msg.platform)}
                  </div>
                  <span className="font-semibold text-sm text-foreground truncate">
                    {msg.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-foreground break-words">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-background border-primary/20 focus:border-primary"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Connected to {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""}
        </p>
      </div>
    </Card>
  );
}
