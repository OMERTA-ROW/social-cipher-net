import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  is_live: boolean;
  user_id: string;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  stream_id: string;
  is_host: boolean;
  is_active: boolean;
  joined_at: string;
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

export function useLiveStream() {
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentStream();
    loadInvitations();
  }, []);

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
      .single();

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

    // Load profiles separately
    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const participantsWithProfiles = data.map(participant => ({
        ...participant,
        profiles: profiles?.find(p => p.id === participant.user_id)
      }));

      setParticipants(participantsWithProfiles as Participant[]);
    }
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

    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        title,
        description,
        user_id: user.id,
        is_live: true,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start stream",
        variant: "destructive",
      });
      return;
    }

    // Add host as participant
    await supabase.from("live_stream_participants").insert({
      stream_id: data.id,
      user_id: user.id,
      is_host: true,
      is_active: true,
    });

    setCurrentStream(data);
    toast({
      title: "Stream Started",
      description: "Your live stream is now active",
    });
  };

  const endStream = async () => {
    if (!currentStream) return;

    const { error } = await supabase
      .from("live_streams")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("id", currentStream.id);

    if (error) {
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

  return {
    currentStream,
    participants,
    invitations,
    startStream,
    endStream,
    inviteUser,
    respondToInvitation,
  };
}
