import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startThread } from "@/lib/messaging";
import { toast } from "sonner";

interface Person {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onStarted: (threadId: string) => void;
}

/** Search real accounts and open (or reuse) a direct conversation with one. */
const NewConversationDialog = ({ open, onOpenChange, currentUserId, onStarted }: Props) => {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      let request = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", currentUserId)
        .limit(20);
      const term = query.trim();
      if (term) request = request.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      const { data } = await request;
      if (!alive) return;
      setPeople((data ?? []) as Person[]);
      setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, query, currentUserId]);

  const start = async (person: Person) => {
    setStartingId(person.id);
    try {
      const threadId = await startThread(person.id);
      onStarted(threadId);
      onOpenChange(false);
      setQuery("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start that conversation");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Search for someone to start a conversation with.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or handle"
        />
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : people.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No accounts found.</p>
          ) : (
            people.map((person) => (
              <button
                key={person.id}
                onClick={() => start(person)}
                disabled={startingId === person.id}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/40"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={person.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback>
                    {(person.display_name || person.username || "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {person.display_name || person.username || "Member"}
                  </div>
                  {person.username && (
                    <div className="truncate text-xs text-muted-foreground">@{person.username}</div>
                  )}
                </div>
                {startingId === person.id && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
