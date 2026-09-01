import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { setSpaceBgSettings, useSpaceBgSettings, type SpaceBgMode } from "@/lib/spaceBackgroundSettings";

const MODES: { value: SpaceBgMode; label: string; hint: string }[] = [
  { value: "full", label: "Full", desc: "", hint: "Solar system, comets, belt" } as never,
  { value: "lite", label: "Lite", hint: "Fewer bodies, lower cost" },
  { value: "off", label: "Off", hint: "Static gradient only" },
];

const BackgroundControl = ({ className }: { className?: string }) => {
  const { mode, dim } = useSpaceBgSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-foreground hover:text-primary", className)}
          title="Background settings"
          aria-label="Background settings"
        >
          <Sparkles className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 bg-card/95 backdrop-blur-xl border-border">
        <p className="text-sm font-semibold mb-1">Space background</p>
        <p className="text-xs text-muted-foreground mb-3">
          Lower this if you want maximum readability or battery life.
        </p>

        <div className="grid grid-cols-3 gap-1 mb-4">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setSpaceBgSettings({ mode: m.value })}
              title={m.hint}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium border transition-colors",
                mode === m.value
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className="text-xs text-muted-foreground flex items-center justify-between mb-2">
          <span>Dim</span>
          <span>{Math.round(dim * 100)}%</span>
        </label>
        <Slider
          value={[dim * 100]}
          min={0}
          max={100}
          step={5}
          onValueChange={([v]) => setSpaceBgSettings({ dim: v / 100 })}
        />
      </PopoverContent>
    </Popover>
  );
};

export default BackgroundControl;
