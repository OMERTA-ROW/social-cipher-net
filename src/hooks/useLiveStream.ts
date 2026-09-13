import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { endLiveStream, startLiveStream } from "@/lib/live";

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  is_live: boolean;
  section?: string | null;
  user_id: string;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  stream_id: string;
  is_host: boolean;
  is_admin: boolean;
  is_active: boolean;
  is_muted: boolean;
  is_blocked: boolean;
  joined_at: string;
  muted_by?: string;
  blocked_by?: string;
  muted_at?: string;
  blocked_at?: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface Invitation {
  id: string;
  stream_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  live_streams?: LiveStream;
  inviter_profile?: {
    username: string;
    display_name: string;
  };
}

/**
 * Live is scoped per section: going live in Trading is a separate stream from
 * going live in Studio, Theater, Arena or on a profile.
 */
export function useLiveStream(section: string = "studio") {
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentStream();
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (currentStream) {
      loadParticipants();
      subscribeToParticipants();
    }
  }, [currentStream]);

  const loadCurrentStream = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_live", true)
      .eq("section", section)
      .maybeSingle();

    if (data && !error) {
      setCurrentStream(data);
    }
  };

  const loadParticipants = async () => {
    if (!currentStream) return;

    const { data, error } = await supabase
      .from("live_stream_participants")
      .select("*")
      .eq("stream_id", currentStream.id)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to load participants:", error);
      return;
    }

    if (!data || data.length === 0) {
      setParticipants([]);
      return;
    }

    const userIds = data.map((participant) => participant.user_id);

    // Who someone is and whether they have been muted or blocked are two
    // separate records now. Moderation is only fully visible to stream admins,
    // so anything missing simply reads as "not muted, not blocked".
    const [{ data: profiles }, { data: moderation }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds),
      supabase
        .from("live_stream_moderation")
        .select(
          "user_id, is_muted, is_blocked, muted_by, blocked_by, muted_at, blocked_at"
        )
        .eq("stream_id", currentStream.id),
    ]);

    const moderationBy = new Map((moderation ?? []).map((row) => [row.user_id, row]));

    const merged = data.map((participant) => {
      const state = moderationBy.get(participant.user_id);
      return {
        ...participant,
        is_muted: state?.is_muted ?? false,
        is_blocked: state?.is_blocked ?? false,
        muted_by: state?.muted_by ?? undefined,
        blocked_by: state?.blocked_by ?? undefined,
        muted_at: state?.muted_at ?? undefined,
        blocked_at: state?.blocked_at ?? undefined,
        profiles: profiles?.find((profile) => profile.id === participant.user_id),
      };
    });

    setParticipants(merged as Participant[]);
  };

  const loadInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("live_stream_invitations")
      .select("*")
      .eq("invitee_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Failed to load invitations:", error);
      return;
    }

    if (data && data.length > 0) {
      // Load related data separately
      const streamIds = data.map(inv => inv.stream_id);
      const inviterIds = data.map(inv => inv.inviter_id);

      const { data: streams } = await supabase
        .from("live_streams")
        .select("id, title, description, is_live, user_id, created_at")
        .in("id", streamIds);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", inviterIds);

      const invitationsWithData = data.map(invitation => ({
        ...invitation,
        live_streams: streams?.find(s => s.id === invitation.stream_id),
        inviter_profile: profiles?.find(p => p.id === invitation.inviter_id)
      }));

      setInvitations(invitationsWithData as Invitation[]);
    }
  };

  const subscribeToParticipants = () => {
    if (!currentStream) return;

    const channel = supabase
      .channel(`stream-${currentStream.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stream_participants",
          filter: `stream_id=eq.${currentStream.id}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startStream = async (title: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to start a stream",
        variant: "destructive",
      });
      return;
    }

    try {
      const { streamId } = await startLiveStream({ title, description, section });
      const { data, error } = await supabase.from("live_streams").select("*").eq("id", streamId).single();
      if (error) throw error;
      setCurrentStream(data);
      toast({
        title: "Stream Started",
        description: "Your live stream is active and posted to the feed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start stream",
        variant: "destructive",
      });
    }
  };

  const endStream = async () => {
    if (!currentStream) return;

    try {
      await endLiveStream(currentStream.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end stream",
        variant: "destructive",
      });
      return;
    }

    setCurrentStream(null);
    setParticipants([]);
    toast({
      title: "Stream Ended",
      description: "Your live stream has ended",
    });
  };

  const inviteUser = async (userId: string) => {
    if (!currentStream) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("live_stream_invitations").insert({
      stream_id: currentStream.id,
      inviter_id: user.id,
      invitee_id: userId,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Invitation Sent",
      description: "User has been invited to join the stream",
    });
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("live_stream_invitations")
      .update({ 
        status: accept ? "accepted" : "rejected",
        responded_at: new Date().toISOString()
      })
      .eq("id", invitationId);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to respond to invitation",
        variant: "destructive",
      });
      return;
    }

    if (accept) {
      const { error: joinError } = await supabase
        .from("live_stream_participants")
        .insert({
          stream_id: invitation.stream_id,
          user_id: user.id,
          is_host: false,
          is_active: true,
        });

      if (joinError) {
        toast({
          title: "Error",
          description: "Failed to join stream",
          variant: "destructive",
        });
        return;
      }

      if (invitation.live_streams) {
        setCurrentStream(invitation.live_streams);
      }

      toast({
        title: "Joined Stream",
        description: "You have joined the live stream",
      });
    }

    loadInvitations();
  };

  const makeAdmin = async (participantId: string) => {
    if (!currentStream) return;

    const { error } = await supabase
      .from("live_stream_participants")
      .update({ is_admin: true })
      .eq("id", participantId)
      .eq("stream_id", currentStream.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to make user admin",
        variant: "destructive",
      });
      return;
    }

    loadParticipants();
    toast({
      title: "Success",
      description: "User is now an admin",
    });
  };

  /**
   * Mute and block state lives in `live_stream_moderation`, keyed by stream +
   * person, instead of sitting on the participation row. Only stream admins
   * can write it and the database audits every change, so the app has to look
   * up who the participation row belongs to before recording a decision.
   */
  const moderationTarget = async (participantId: string) => {
    if (!currentStream) return null;

    const { data } = await supabase
      .from("live_stream_participants")
      .select("user_id")
      .eq("id", participantId)
      .eq("stream_id", currentStream.id)
      .maybeSingle();

    return data?.user_id ?? null;
  };

  const muteParticipant = async (participantId: string, mute: boolean) => {
    if (!currentStream) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUser = await moderationTarget(participantId);
    if (!targetUser) {
      toast({
        title: "Error",
        description: "Participant not found",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("live_stream_moderation")
      .upsert(
        {
          stream_id: currentStream.id,
          user_id: targetUser,
          is_muted: mute,
          muted_by: mute ? user.id : null,
          muted_at: mute ? new Date().toISOString() : null,
        },
        { onConflict: "stream_id,user_id" }
      );

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${mute ? 'mute' : 'unmute'} participant`,
        variant: "destructive",
      });
      return;
    }

    loadParticipants();
    toast({
      title: "Success",
      description: `Participant ${mute ? 'muted' : 'unmuted'}`,
    });
  };

  const blockParticipant = async (participantId: string, block: boolean) => {
    if (!currentStream) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUser = await moderationTarget(participantId);
    if (!targetUser) {
      toast({
        title: "Error",
        description: "Participant not found",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("live_stream_moderation")
      .upsert(
        {
          stream_id: currentStream.id,
          user_id: targetUser,
          is_blocked: block,
          blocked_by: block ? user.id : null,
          blocked_at: block ? new Date().toISOString() : null,
        },
        { onConflict: "stream_id,user_id" }
      );

    // Whether someone is still taking part in the stream stays on the
    // participation row; only the decision itself is recorded separately.
    const { error: activeError } = await supabase
      .from("live_stream_participants")
      .update({ is_active: !block })
      .eq("id", participantId)
      .eq("stream_id", currentStream.id);

    if (error || activeError) {
      toast({
        title: "Error",
        description: `Failed to ${block ? 'block' : 'unblock'} participant`,
        variant: "destructive",
      });
      return;
    }

    loadParticipants();
    toast({
      title: "Success",
      description: `Participant ${block ? 'blocked' : 'unblocked'}`,
    });
  };

  const kickParticipant = async (participantId: string) => {
    if (!currentStream) return;

    const { error } = await supabase
      .from("live_stream_participants")
      .update({ 
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq("id", participantId)
      .eq("stream_id", currentStream.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to kick participant",
        variant: "destructive",
      });
      return;
    }

    loadParticipants();
    toast({
      title: "Success",
      description: "Participant removed from stream",
    });
  };

  return {
    currentStream,
    participants,
    invitations,
    startStream,
    endStream,
    inviteUser,
    respondToInvitation,
    makeAdmin,
    muteParticipant,
    blockParticipant,
    kickParticipant,
  };
}
