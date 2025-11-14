import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, User } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  is_host: boolean;
  is_active: boolean;
  joined_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface LiveStreamParticipantsProps {
  participants: Participant[];
}

export function LiveStreamParticipants({ participants }: LiveStreamParticipantsProps) {
  return (
    <div className="space-y-3">
      {participants.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No participants yet</p>
      ) : (
        participants.map((participant) => (
          <Card key={participant.id} className="p-3 bg-card/50 backdrop-blur border-primary/10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={participant.profiles?.avatar_url} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {participant.profiles?.display_name || participant.profiles?.username}
                  </p>
                  {participant.is_host && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  @{participant.profiles?.username}
                </p>
              </div>
              {participant.is_active && (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
