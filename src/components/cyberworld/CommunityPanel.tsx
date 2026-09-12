/**
 * The signed-in member's own community: the people they follow and the people
 * following them, read from real follower records.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { useLivePresence } from "@/hooks/useLivePresence";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Member {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

const useMembers = (userId: string | null) => {
  const [followers, setFollowers] = useState<Member[] | null>(null);
  const [following, setFollowing] = useState<Member[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const [inbound, outbound] = await Promise.all([
        supabase.from("followers").select("follower_id").eq("following_id", userId).limit(100),
        supabase.from("followers").select("following_id").eq("follower_id", userId).limit(100),
      ]);
      const ids = [
        ...new Set([
          ...(inbound.data ?? []).map((r) => r.follower_id),
          ...(outbound.data ?? []).map((r) => r.following_id),
        ]),
      ];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", ids)
        : { data: [] as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[] };
      if (!alive) return;
      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          {
            id: p.id,
            name: p.display_name || p.username || "Cyber Link member",
            handle: p.username ? `@${p.username}` : "",
            avatar: p.avatar_url,
          },
        ]),
      );
      setFollowers((inbound.data ?? []).map((r) => byId.get(r.follower_id)).filter(Boolean) as Member[]);
      setFollowing((outbound.data ?? []).map((r) => byId.get(r.following_id)).filter(Boolean) as Member[]);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  return { followers, following };
};

const MemberList = ({ members, empty }: { members: Member[] | null; empty: string }) => {
  const navigate = useNavigate();
  const liveIds = useLivePresence((members ?? []).map((member) => member.id));
  if (!members) return <Skeleton className="h-14 w-full" />;
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>
    );
  }
  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex min-w-0 items-center gap-3">
            <PresenceAvatar src={member.avatar} name={member.name} size={40} isLive={liveIds.has(member.id)} />
            <div className="min-w-0">
              <p className="truncate font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted-foreground">{member.handle}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/profile/${member.id}`)}>
            View
          </Button>
        </div>
      ))}
    </div>
  );
};

const CommunityPanel = ({ userId }: { userId: string | null }) => {
  const { followers, following } = useMembers(userId);

  return (
    <Tabs defaultValue="followers" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="followers">Followers</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
      </TabsList>
      <TabsContent value="followers">
        <MemberList members={followers} empty="No one is following you yet." />
      </TabsContent>
      <TabsContent value="following">
        <MemberList members={following} empty="You are not following anyone yet." />
      </TabsContent>
    </Tabs>
  );
};

export default CommunityPanel;
