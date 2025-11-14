import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Video } from "lucide-react";

interface Invitation {
  id: string;
  stream_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  live_streams?: {
    title: string;
    description: string | null;
  };
  inviter_profile?: {
    username: string;
    display_name: string;
  };
}

interface LiveStreamInvitationsProps {
  invitations: Invitation[];
  onRespond: (invitationId: string, accept: boolean) => void;
}

export function LiveStreamInvitations({ invitations, onRespond }: LiveStreamInvitationsProps) {
  if (invitations.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="p-4 bg-card/95 backdrop-blur border-primary/20 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {invitation.inviter_profile?.display_name || invitation.inviter_profile?.username} invited you
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {invitation.live_streams?.title}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => onRespond(invitation.id, true)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRespond(invitation.id, false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
