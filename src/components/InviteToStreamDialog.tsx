import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface InviteToStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  onInvite: (userId: string) => void;
}

export function InviteToStreamDialog({ open, onOpenChange, streamId, onInvite }: InviteToStreamDialogProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (search.trim().length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [search]);

  const searchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const handleInvite = (userId: string) => {
    onInvite(userId);
    setSearch("");
    setUsers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Users to Stream</DialogTitle>
          <DialogDescription>
            Search for users to invite to your live stream
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                {search.trim().length >= 2 ? "No users found" : "Start typing to search"}
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleInvite(user.id)}>
                    Invite
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
