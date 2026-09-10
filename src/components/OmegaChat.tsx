import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { GiftGallery } from "./GiftGallery";
import { GiftOverlay } from "./GiftOverlay";
import { SnipeLayer } from "./sniper/SnipeLayer";

interface Gift {
  id: string;
  name: string;
  description: string;
  price: number;
  icon_url: string;
  animation_type: string;
}

interface StreamGift {
  id: string;
  gift_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  gift: Gift;
  sender_username: string;
}

interface OmegaChatProps {
  streamId: string;
  streamerId: string;
}

export function OmegaChat({ streamId, streamerId }: OmegaChatProps) {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [activeGifts, setActiveGifts] = useState<StreamGift[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    loadGifts();
    loadRecentGifts();
    setupRealtimeSubscription();
  }, [streamId]);

  const loadGifts = async () => {
    const { data, error } = await supabase
      .from("gifts")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Failed to load gifts:", error);
      return;
    }

    if (data) {
      setGifts(data);
    }
  };

  const loadRecentGifts = async () => {
    const { data, error } = await supabase
      .from("stream_gifts")
      .select(`
        *,
        gift:gifts(*)
      `)
      .eq("stream_id", streamId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to load recent gifts:", error);
      return;
    }

    if (data) {
      const giftsWithUsername = await Promise.all(
        data.map(async (gift) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", gift.sender_id)
            .single();

          return {
            ...gift,
            sender_username: profile?.username || "Anonymous",
          };
        })
      );

      setActiveGifts(giftsWithUsername as StreamGift[]);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`omega-chat-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_gifts",
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const newGift = payload.new as any;
          
          // Load gift details
          const { data: giftData } = await supabase
            .from("gifts")
            .select("*")
            .eq("id", newGift.gift_id)
            .single();

          // Load sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newGift.sender_id)
            .single();

          const fullGift = {
            ...newGift,
            gift: giftData,
            sender_username: profile?.username || "Anonymous",
          };

          setActiveGifts((prev) => [fullGift, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="relative">
      <GiftOverlay gifts={activeGifts} />
      <SnipeLayer targetUserId={streamerId} />
      
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <Button
          onClick={() => navigate("/token-purchase")}
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
          size="icon"
          title="Buy Tokens"
        >
          <Coins className="w-6 h-6" />
        </Button>
        
        <Button
          onClick={() => setShowGallery(true)}
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
          size="icon"
          variant="secondary"
          title="Send Gift"
        >
          <span className="text-2xl">🎁</span>
        </Button>
      </div>

      {showGallery && (
        <GiftGallery
          gifts={gifts}
          streamId={streamId}
          streamerId={streamerId}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
