import { useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clapperboard, CalendarPlus, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTheaterEvents, type TheaterEvent } from "@/hooks/useTheaterEvents";
import TheaterRoom from "@/components/theater/TheaterRoom";

const Theater = () => {
  const { events, loading, userId, refresh } = useTheaterEvents();
  const [active, setActive] = useState<TheaterEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_url: "",
    poster_url: "",
    starts_at: "",
  });

  const { showing, upcoming } = useMemo(() => {
    const now = Date.now();
    return {
      showing: events.filter(
        (e) => e.is_live || new Date(e.starts_at).getTime() <= now,
      ),
      upcoming: events.filter(
        (e) => !e.is_live && new Date(e.starts_at).getTime() > now,
      ),
    };
  }, [events]);

  const createEvent = async () => {
    if (!userId) {
      toast.error("Sign in to host a screening");
      return;
    }
    if (!form.title.trim() || !form.starts_at) {
      toast.error("Add a title and a start time");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("theater_events").insert({
      host_id: userId,
      title: form.title.trim().slice(0, 160),
      description: form.description.trim() || null,
      video_url: form.video_url.trim() || null,
      poster_url: form.poster_url.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      status: "scheduled",
    });
    setCreating(false);
    if (error) {
      toast.error("Could not schedule the screening");
      return;
    }
    toast.success("Screening scheduled");
    setForm({ title: "", description: "", video_url: "", poster_url: "", starts_at: "" });
    setOpen(false);
    refresh();
  };

  const goLive = async (event: TheaterEvent) => {
    const { error } = await supabase
      .from("theater_events")
      .update({ is_live: true, status: "live" })
      .eq("id", event.id);
    if (error) {
      toast.error("Could not start the show");
      return;
    }
    refresh();
    setActive({ ...event, is_live: true });
  };

  const EventCard = ({ event }: { event: TheaterEvent }) => (
    <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors flex flex-col">
      <div className="aspect-video rounded-lg overflow-hidden bg-muted/20 mb-3 flex items-center justify-center">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={`Poster for ${event.title}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <Clapperboard className="w-12 h-12 text-primary" />
        )}
      </div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-foreground">{event.title}</h3>
        {event.is_live && (
          <Badge variant="destructive" className="animate-pulse text-[10px]">
            LIVE
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(event.starts_at).toLocaleString()}
      </p>
      {event.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {event.description}
        </p>
      )}
      <div className="mt-auto flex gap-2">
        <Button className="flex-1" onClick={() => setActive(event)}>
          <Ticket className="w-4 h-4 mr-2" />
          Enter
        </Button>
        {userId === event.host_id && !event.is_live && (
          <Button variant="outline" onClick={() => goLive(event)}>
            Start
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation onCreatePost={() => {}} />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clapperboard className="w-9 h-9 text-primary text-glow" />
              <h1 className="text-4xl font-bold text-primary text-glow">
                Movie Theater
              </h1>
            </div>
            <p className="text-muted-foreground">
              Host a screening, watch together in sync, and chat beside the picture.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="glow-primary">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Host a screening
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule a screening</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="t-title">Title</Label>
                  <Input
                    id="t-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-when">Starts at</Label>
                  <Input
                    id="t-when"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-video">Video link</Label>
                  <Input
                    id="t-video"
                    placeholder="https://..."
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-poster">Poster image link</Label>
                  <Input
                    id="t-poster"
                    placeholder="https://..."
                    value={form.poster_url}
                    onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-desc">Description</Label>
                  <Textarea
                    id="t-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={createEvent} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        {active ? (
          <TheaterRoom event={active} userId={userId} onClose={() => setActive(null)} />
        ) : loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading showtimes
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-3">Now showing</h2>
              {showing.length === 0 ? (
                <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 text-sm text-muted-foreground">
                  Nothing playing right now. Schedule the first screening.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {showing.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">Coming up</h2>
              {upcoming.length === 0 ? (
                <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 text-sm text-muted-foreground">
                  No upcoming showtimes yet.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Theater;
