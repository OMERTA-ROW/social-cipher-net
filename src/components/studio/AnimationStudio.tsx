import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Plus,
  Save,
  Diamond,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- model ---------------- */

interface Pose {
  x: number;
  y: number;
  scale: number;
  headTilt: number;
  armLeft: number;
  armRight: number;
  legLeft: number;
  legRight: number;
}

interface Keyframe {
  time: number;
  pose: Pose;
}

interface Character {
  id: string;
  name: string;
  color: string;
  keyframes: Keyframe[];
}

interface Scene {
  duration: number;
  backdrop: string;
  characters: Character[];
}

const BACKDROPS: Record<string, [string, string]> = {
  "Neon city": ["#04121a", "#0b3b47"],
  "Deep space": ["#000000", "#0a0f22"],
  "Solar flare": ["#140704", "#3b1a0b"],
  "Grid floor": ["#01110d", "#052b22"],
};

const basePose = (x = 200, y = 220): Pose => ({
  x,
  y,
  scale: 1,
  headTilt: 0,
  armLeft: -35,
  armRight: 35,
  legLeft: -12,
  legRight: 12,
});

const newCharacter = (index: number): Character => ({
  id: crypto.randomUUID(),
  name: `Character ${index + 1}`,
  color: ["#22d3ee", "#f472b6", "#facc15", "#a78bfa"][index % 4],
  keyframes: [{ time: 0, pose: basePose(160 + index * 120) }],
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const poseAt = (character: Character, time: number): Pose => {
  const frames = [...character.keyframes].sort((a, b) => a.time - b.time);
  if (frames.length === 0) return basePose();
  if (time <= frames[0].time) return frames[0].pose;
  if (time >= frames[frames.length - 1].time)
    return frames[frames.length - 1].pose;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (time >= a.time && time <= b.time) {
      const raw = (time - a.time) / Math.max(0.0001, b.time - a.time);
      // ease in/out so movement flows rather than snapping
      const t = raw * raw * (3 - 2 * raw);
      const keys = Object.keys(a.pose) as Array<keyof Pose>;
      const out = {} as Pose;
      keys.forEach((k) => {
        out[k] = lerp(a.pose[k], b.pose[k], t);
      });
      return out;
    }
  }
  return frames[0].pose;
};

/* ---------------- component ---------------- */

interface AnimationStudioProps {
  userId: string | null;
}

const AnimationStudio = ({ userId }: AnimationStudioProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastTickRef = useRef<number>(0);

  const [scene, setScene] = useState<Scene>({
    duration: 6,
    backdrop: "Neon city",
    characters: [newCharacter(0)],
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState("Untitled scene");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId && scene.characters[0]) setSelectedId(scene.characters[0].id);
  }, [scene.characters, selectedId]);

  const selected = useMemo(
    () => scene.characters.find((c) => c.id === selectedId) ?? null,
    [scene.characters, selectedId],
  );
  const livePose = selected ? poseAt(selected, time) : null;

  /* ---- rendering ---- */
  const draw = useCallback(
    (atTime: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const [top, bottom] = BACKDROPS[scene.backdrop] ?? BACKDROPS["Deep space"];
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ground line
      ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 60);
      ctx.lineTo(canvas.width, canvas.height - 60);
      ctx.stroke();

      scene.characters.forEach((character) => {
        const pose = poseAt(character, atTime);
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.scale(pose.scale, pose.scale);
        ctx.strokeStyle = character.color;
        ctx.fillStyle = character.color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";

        // head
        ctx.save();
        ctx.rotate((pose.headTilt * Math.PI) / 180);
        ctx.beginPath();
        ctx.arc(0, -60, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // spine
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(0, 20);
        ctx.stroke();

        const limb = (angle: number, length: number, fromY: number) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(0, fromY);
          ctx.lineTo(Math.cos(rad) * length, fromY + Math.sin(rad) * length * -1);
          ctx.stroke();
        };

        limb(pose.armLeft + 180, 34, -30);
        limb(pose.armRight, 34, -30);
        limb(pose.legLeft + 180, 40, 20);
        limb(pose.legRight, 40, 20);

        ctx.restore();
      });
    },
    [scene],
  );

  useEffect(() => {
    draw(time);
  }, [draw, time]);

  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = performance.now();
    const step = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setTime((t) => {
        const next = t + delta;
        return next > scene.duration ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, scene.duration]);

  /* ---- editing ---- */
  const updatePose = (key: keyof Pose, value: number) => {
    if (!selected) return;
    setScene((s) => ({
      ...s,
      characters: s.characters.map((c) => {
        if (c.id !== selected.id) return c;
        const existing = c.keyframes.find((k) => Math.abs(k.time - time) < 0.05);
        const current = poseAt(c, time);
        const pose = { ...current, [key]: value };
        const keyframes = existing
          ? c.keyframes.map((k) => (k === existing ? { time: k.time, pose } : k))
          : [...c.keyframes, { time: Number(time.toFixed(2)), pose }];
        return { ...c, keyframes };
      }),
    }));
  };

  const addKeyframe = () => {
    if (!selected) return;
    setScene((s) => ({
      ...s,
      characters: s.characters.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              keyframes: [
                ...c.keyframes.filter((k) => Math.abs(k.time - time) >= 0.05),
                { time: Number(time.toFixed(2)), pose: poseAt(c, time) },
              ],
            }
          : c,
      ),
    }));
    toast.success("Keyframe added");
  };

  const removeKeyframe = (frameTime: number) => {
    if (!selected) return;
    setScene((s) => ({
      ...s,
      characters: s.characters.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              keyframes:
                c.keyframes.length > 1
                  ? c.keyframes.filter((k) => k.time !== frameTime)
                  : c.keyframes,
            }
          : c,
      ),
    }));
  };

  /* ---- persistence ---- */
  const loadProjects = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("studio_projects")
      .select("id, title")
      .order("updated_at", { ascending: false })
      .limit(20);
    setProjects((data ?? []) as Array<{ id: string; title: string }>);
  }, [userId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const save = async () => {
    if (!userId) {
      toast.error("Sign in to save your scene");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      title: title.slice(0, 120),
      kind: "animation",
      data: JSON.parse(JSON.stringify(scene)),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = projectId
      ? await supabase
          .from("studio_projects")
          .update(payload)
          .eq("id", projectId)
          .select("id")
          .single()
      : await supabase.from("studio_projects").insert(payload).select("id").single();
    setSaving(false);
    if (error) {
      toast.error("Could not save the scene");
      return;
    }
    setProjectId((data as { id: string }).id);
    toast.success("Scene saved");
    loadProjects();
  };

  const openProject = async (id: string) => {
    const { data } = await supabase
      .from("studio_projects")
      .select("id, title, data")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    const record = data as { id: string; title: string; data: unknown };
    setProjectId(record.id);
    setTitle(record.title);
    setScene(record.data as Scene);
    setTime(0);
    setPlaying(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-[220px]"
            aria-label="Scene title"
          />
          <Select
            value={scene.backdrop}
            onValueChange={(v) => setScene((s) => ({ ...s, backdrop: v }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(BACKDROPS).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>

        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full rounded-lg border border-primary/20 bg-black"
        />

        <div className="flex items-center gap-3 mt-3">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Slider
            value={[time]}
            min={0}
            max={scene.duration}
            step={0.05}
            onValueChange={([v]) => {
              setPlaying(false);
              setTime(v);
            }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {time.toFixed(2)}s
          </span>
        </div>

        {/* timeline markers */}
        <div className="relative h-8 mt-2 rounded border border-primary/15 bg-muted/20">
          {selected?.keyframes.map((k) => (
            <button
              key={k.time}
              onClick={() => {
                setPlaying(false);
                setTime(k.time);
              }}
              onDoubleClick={() => removeKeyframe(k.time)}
              title={`${k.time}s — double-click to remove`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-primary"
              style={{ left: `${(k.time / scene.duration) * 100}%` }}
            >
              <Diamond className="w-3.5 h-3.5 fill-current" />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={addKeyframe}>
            <Plus className="w-4 h-4 mr-1" />
            Keyframe
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setScene((s) => ({
                ...s,
                characters: [...s.characters, newCharacter(s.characters.length)],
              }))
            }
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Character
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="duration" className="text-xs text-muted-foreground">
              Length
            </Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={60}
              value={scene.duration}
              onChange={(e) =>
                setScene((s) => ({
                  ...s,
                  duration: Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                }))
              }
              className="w-20 h-8"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
          <h3 className="font-semibold text-foreground mb-2">Cast</h3>
          <div className="space-y-1 mb-3">
            {scene.characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm border ${
                  c.id === selectedId
                    ? "border-primary/50 text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <span className="flex-1 text-left truncate">{c.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {c.keyframes.length}
                </Badge>
                {scene.characters.length > 1 && (
                  <Trash2
                    className="w-3.5 h-3.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScene((s) => ({
                        ...s,
                        characters: s.characters.filter((x) => x.id !== c.id),
                      }));
                      setSelectedId("");
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {selected && livePose && (
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                Rig at {time.toFixed(2)}s
              </h4>
              {(
                [
                  ["x", "Position X", 0, 640],
                  ["y", "Position Y", 0, 360],
                  ["scale", "Size", 0.4, 2.2],
                  ["headTilt", "Head tilt", -45, 45],
                  ["armLeft", "Left arm", -170, 170],
                  ["armRight", "Right arm", -170, 170],
                  ["legLeft", "Left leg", -80, 80],
                  ["legRight", "Right leg", -80, 80],
                ] as Array<[keyof Pose, string, number, number]>
              ).map(([key, label, min, max]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span>{livePose[key].toFixed(key === "scale" ? 2 : 0)}</span>
                  </div>
                  <Slider
                    value={[livePose[key]]}
                    min={min}
                    max={max}
                    step={key === "scale" ? 0.05 : 1}
                    onValueChange={([v]) => updatePose(key, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {projects.length > 0 && (
          <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
            <h3 className="font-semibold text-foreground mb-2">My scenes</h3>
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="w-full text-left text-sm text-muted-foreground hover:text-primary truncate"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AnimationStudio;
