import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, User, MoreVertical, Mic, MicOff, Ban, Shield } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  is_host: boolean;
  is_admin: boolean;
  is_active: boolean;
  is_muted: boolean;
  is_blocked: boolean;
  joined_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface LiveStreamParticipantsProps {
  participants: Participant[];
  currentUserId?: string;
  isCurrentUserAdmin?: boolean;
  onMakeAdmin?: (participantId: string) => void;
  onMute?: (participantId: string, mute: boolean) => void;
  onBlock?: (participantId: string, block: boolean) => void;
}

export function LiveStreamParticipants({ 
  participants, 
  currentUserId,
  isCurrentUserAdmin,
  onMakeAdmin,
  onMute,
  onBlock
}: LiveStreamParticipantsProps) {
  return (
    <div className="space-y-3">
      {participants.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No participants yet</p>
      ) : (
        participants.map((participant) => {
          const isCurrentUser = participant.user_id === currentUserId;
          const canManage = isCurrentUserAdmin && !isCurrentUser && !participant.is_host;

          return (
            <Card key={participant.id} className="p-3 bg-card/50 backdrop-blur border-primary/10">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={participant.profiles?.avatar_url} />
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {participant.profiles?.display_name || participant.profiles?.username}
                    </p>
                    {participant.is_host && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                    )}
                    {participant.is_admin && !participant.is_host && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {participant.is_muted && (
                      <Badge variant="destructive" className="text-xs">
                        <MicOff className="w-3 h-3 mr-1" />
                        Muted
                      </Badge>
                    )}
                    {participant.is_blocked && (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{participant.profiles?.username}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {participant.is_active && !participant.is_blocked && (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!participant.is_admin && onMakeAdmin && (
                          <DropdownMenuItem onClick={() => onMakeAdmin(participant.id)}>
                            <Shield className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {onMute && (
                          <DropdownMenuItem 
                            onClick={() => onMute(participant.id, !participant.is_muted)}
                          >
                            {participant.is_muted ? (
                              <>
                                <Mic className="w-4 h-4 mr-2" />
                                Unmute
                              </>
                            ) : (
                              <>
                                <MicOff className="w-4 h-4 mr-2" />
                                Mute
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onBlock && (
                          <DropdownMenuItem 
                            onClick={() => onBlock(participant.id, !participant.is_blocked)}
                            className="text-destructive"
                          >
                            {participant.is_blocked ? (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4 mr-2" />
                                Block
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
