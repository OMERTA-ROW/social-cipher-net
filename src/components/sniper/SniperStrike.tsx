import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SnipeHit } from "@/hooks/useSnipeStatus";

interface SniperStrikeProps {
  hit: SnipeHit;
  onComplete: () => void;
}

type Phase = "acquire" | "lock" | "shot" | "shatter";

/**
 * Cinematic sniper sequence: scope sweeps in, sways, locks, fires, the screen
 * jolts and shatters at the impact point. Runs ~6s, then hands off to the
 * persistent crack overlay.
 */
export function SniperStrike({ hit, onComplete }: SniperStrikeProps) {
  const [phase, setPhase] = useState<Phase>("acquire");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("lock"), 2200),
      window.setTimeout(() => setPhase("shot"), 3600),
      window.setTimeout(() => setPhase("shatter"), 4000),
      window.setTimeout(() => onComplete(), 6200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [hit.id, onComplete]);

  const x = hit.impact_x;
  const y = hit.impact_y;
  const initials = (hit.sender_name || "?").slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        key={hit.id}
        className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-hidden="true"
      >
        {/* scope lens vignette */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "shatter" ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background:
              "radial-gradient(circle at var(--sx) var(--sy), transparent 22%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.94) 72%)",
            ["--sx" as string]: `${x}%`,
            ["--sy" as string]: `${y}%`,
          }}
        />

        {/* reticle with breathing sway */}
        <motion.div
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ scale: 3.4, opacity: 0, rotate: -8 }}
          animate={
            phase === "shatter"
              ? { scale: 1.6, opacity: 0 }
              : {
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                  x: phase === "acquire" ? [0, 9, -7, 4, 0] : 0,
                  y: phase === "acquire" ? [0, -6, 5, -3, 0] : 0,
                }
          }
          transition={{
            duration: phase === "acquire" ? 2.2 : 0.4,
            ease: "easeInOut",
          }}
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <svg width="320" height="320" viewBox="0 0 320 320" className="opacity-90">
              <circle
                cx="160"
                cy="160"
                r="150"
                fill="none"
                stroke={phase === "acquire" ? "hsl(var(--primary))" : "#ff2d2d"}
                strokeWidth="2"
                opacity="0.8"
              />
              <circle
                cx="160"
                cy="160"
                r="96"
                fill="none"
                stroke={phase === "acquire" ? "hsl(var(--primary))" : "#ff2d2d"}
                strokeWidth="1"
                opacity="0.55"
              />
              <circle
                cx="160"
                cy="160"
                r="26"
                fill="none"
                stroke={phase === "acquire" ? "hsl(var(--primary))" : "#ff2d2d"}
                strokeWidth="1.5"
                opacity="0.9"
              />
              {[
                "M160 4 L160 118",
                "M160 202 L160 316",
                "M4 160 L118 160",
                "M202 160 L316 160",
              ].map((d) => (
                <path
                  key={d}
                  d={d}
                  stroke={phase === "acquire" ? "hsl(var(--primary))" : "#ff2d2d"}
                  strokeWidth="1.5"
                  opacity="0.85"
                />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <path
                  key={i}
                  d={`M${150 - (i % 2) * 6} ${186 + i * 12} L${170 + (i % 2) * 6} ${186 + i * 12}`}
                  stroke={phase === "acquire" ? "hsl(var(--primary))" : "#ff2d2d"}
                  strokeWidth="1"
                  opacity="0.5"
                />
              ))}
            </svg>
          </div>
        </motion.div>

        {/* lock indicator */}
        <AnimatePresence>
          {phase === "lock" && (
            <motion.div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${x}%`, top: `calc(${y}% + 190px)` }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 0.3, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <span className="rounded border border-[#ff2d2d] px-3 py-1 font-mono text-sm tracking-[0.3em] text-[#ff2d2d]">
                TARGET LOCKED
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* muzzle flash + recoil jolt */}
        <AnimatePresence>
          {phase === "shot" && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.2, 0] }}
              transition={{ duration: 0.45 }}
              style={{
                background:
                  "radial-gradient(circle at var(--sx) var(--sy), rgba(255,240,200,0.95) 0%, rgba(255,150,40,0.6) 12%, transparent 38%)",
                ["--sx" as string]: `${x}%`,
                ["--sy" as string]: `${y}%`,
              }}
            />
          )}
        </AnimatePresence>

        <motion.div
          className="absolute inset-0"
          animate={
            phase === "shot"
              ? { x: [0, -26, 22, -14, 8, 0], y: [0, 18, -12, 7, -3, 0] }
              : { x: 0, y: 0 }
          }
          transition={{ duration: 0.55 }}
        />

        {/* impact burst / shard flare */}
        <AnimatePresence>
          {(phase === "shot" || phase === "shatter") && (
            <motion.svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 0] }}
              transition={{ duration: 2 }}
            >
              {Array.from({ length: 18 }).map((_, i) => {
                const a = (i / 18) * Math.PI * 2;
                const len = 10 + ((i * 7) % 22);
                return (
                  <path
                    key={i}
                    d={`M ${x} ${y} L ${x + Math.cos(a) * len} ${y + Math.sin(a) * len}`}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.35"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.8"
                  />
                );
              })}
              <circle cx={x} cy={y} r="1.6" fill="#fff" opacity="0.9" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* the sniper */}
        <motion.div
          className="absolute left-1/2 top-8 -translate-x-1/2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 rounded-full border border-primary/40 bg-background/85 px-4 py-2 backdrop-blur">
            <Avatar className="h-9 w-9 border border-primary/50">
              {hit.sender_avatar && <AvatarImage src={hit.sender_avatar} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                Sniper
              </p>
              <p className="text-sm font-bold text-foreground">
                {hit.sender_name || "Unknown shooter"}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
