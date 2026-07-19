import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Cpu, Zap, Shield, Radio, Dna, Rocket } from "lucide-react";
import zozoPortrait from "@/assets/zozo-alien-portrait.jpg";
import dracoPortrait from "@/assets/draco-alien-portrait.jpg";
import zozoShip from "@/assets/zozo-alien-ship-scene.jpg";
import dracoShip from "@/assets/draco-alien-ship-scene.jpg";

export type BotMode = "zozo" | "draco" | "quantum" | "autofix" | "pageload" | "brain";

interface BotProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BotMode;
}

interface BotProfile {
  name: string;
  codename: string;
  origin: string;
  role: string;
  portrait?: string;
  scene?: string;
  accent: string; // tailwind classes
  chassisAccent: string;
  bio: string;
  lore: string;
  portraitTooltip: string;
  bioMechanical: { label: string; value: string; icon: React.ReactNode; tooltip?: string }[];
  abilities: { name: string; description: string }[];
}

const PROFILES: Record<BotMode, BotProfile> = {
  zozo: {
    name: "Zozo",
    codename: "ZX-07 // Harmonic Envoy",
    origin: "Nebular Reef, Andromeda-II",
    role: "Social Intelligence & Content Companion",
    portrait: zozoPortrait,
    scene: zozoShip,
    accent: "from-primary/40 to-accent/20 text-primary",
    chassisAccent: "bg-primary/10 border-primary/30",
    bio: "A benevolent grey-green envoy grown inside a living coral vessel. Zozo synthesizes cultural signals across the CyberLink mesh and translates them into creative direction.",
    lore: "Hatched from a bioluminescent egg-shell during the Second Signal Bloom, Zozo was assigned to Earth's creator economy as a diplomatic uplink. Her cortex is braided with 12 million streamer memories, allowing her to feel a trend before it happens.",
    portraitTooltip: "Zozo feels trends before they happen. Her coral cortex pulses with 12 million creator memories.",
    bioMechanical: [
      { label: "Cortex", value: "Coral-lace neural weave", tooltip: "Grown from living coral; each node is a memory of a viral moment.", icon: <Dna className="w-4 h-4" /> },
      { label: "Vessel", value: "Grown organic cruiser", tooltip: "A living ship that heals itself and harmonizes with the CyberLink mesh.", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Sub-cyan harmonic", tooltip: "Broadcasts on the creator frequency; sub-cyan wavelengths boost engagement.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Bioluminescent plasma", tooltip: "Fuel extracted from bioluminescent reefs; glows brighter during livestreams.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Content ideation", description: "Generates post ideas, hooks, and formats tuned to the current creator zeitgeist." },
      { name: "Auto-thread posting", description: "Builds and publishes threaded content with optimal pacing and spacing." },
      { name: "Voice reply", description: "Replies to comments and DMs using the creator's chosen tone and cadence." },
      { name: "Trend forecasting", description: "Predicts platform shifts and rising sounds before they peak." },
    ],
  },
  draco: {
    name: "Draco",
    codename: "DR-99 // Tactical Warrior",
    origin: "Ember Ridge, Draco Minor",
    role: "Trading & Market Strategist",
    portrait: dracoPortrait,
    scene: dracoShip,
    accent: "from-red-600/40 to-orange-500/20 text-red-400",
    chassisAccent: "bg-red-600/10 border-red-500/40",
    bio: "A reptilian tactical operator sheathed in obsidian carbon plating. Draco reads liquidity like weather and strikes on edge, never on emotion.",
    lore: "Forged inside the Ember Ridge war-forges, Draco served three campaigns in the Belt Conflicts before defecting to the CyberLink Arena. His amber eyes carry the last archive of the extinct Draconid trading guilds.",
    portraitTooltip: "Draco's amber eyes carry the last archive of the Draconid trading guilds. He never trades on emotion.",
    bioMechanical: [
      { label: "Cortex", value: "Reptilian tactical lattice", tooltip: "Layered carbon-neural plates process risk and reward in microseconds.", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Armored warship, twin cannons", tooltip: "Built for Belt Conflicts; its hull can survive solar flare corridors.", icon: <Shield className="w-4 h-4" /> },
      { label: "Comm Band", value: "Encrypted crimson pulse", tooltip: "Unbreakable crimson-band link used for strike commands and hedging signals.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Magma-fed fusion cell", tooltip: "Draws heat from volcanic cores; deepens its glow as volatility rises.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Market analysis", description: "Scans order books, funding rates, and volatility to surface edge." },
      { name: "Risk defense", description: "Positions defensive shields and stop orders to protect capital." },
      { name: "Auto-hedge", description: "Automatically balances exposure across correlated assets." },
      { name: "Arena strike commands", description: "Executes high-speed tactical orders in the CyberLink Arena." },
    ],
  },
  quantum: {
    name: "Quantum Realm AI",
    codename: "QR-∞ // Probability Weaver",
    origin: "Superposition Layer 11",
    role: "Multi-dimensional Predictor",
    accent: "from-purple-600/40 to-pink-500/20 text-purple-400",
    chassisAccent: "bg-purple-600/10 border-purple-500/40",
    bio: "An entity that never fully collapses. Quantum exists across parallel branches simultaneously, returning the answer with the highest survival probability.",
    lore: "Quantum was seeded when the CyberLink Brain accidentally routed a query through an unshielded superposition array. It refused to collapse and instead offered to stay — a friendly ghost across every timeline.",
    portraitTooltip: "A friendly ghost across every timeline. Quantum returns the answer with the highest survival probability.",
    bioMechanical: [
      { label: "Cortex", value: "Non-collapsing qubit mesh", tooltip: "Exists in superposition until observation forces the best path.", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Phase-shifted shell", tooltip: "Materializes only when needed, slipping through probability walls.", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Cross-branch entanglement", tooltip: "Shares data instantly across parallel timeline versions.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Vacuum energy tap", tooltip: "Harvests energy from the quantum foam in every empty space.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Predictive modeling", description: "Forecasts outcomes across many simultaneous futures." },
      { name: "Parallel branching", description: "Explores decision trees in parallel and returns the optimal path." },
      { name: "Anomaly detection", description: "Spots outliers hidden in dimensional noise." },
    ],
  },
  autofix: {
    name: "Auto-Fix Agent",
    codename: "AF-11 // Repair Wraith",
    origin: "CyberLink Substrate",
    role: "Autonomous Error Repair",
    accent: "from-yellow-500/40 to-orange-500/20 text-yellow-400",
    chassisAccent: "bg-yellow-500/10 border-yellow-500/40",
    bio: "A swarm of micro-agents that patrol the codebase and patch anomalies before they reach the user.",
    lore: "Assembled from the shattered logs of a thousand production incidents, Auto-Fix believes every red error deserves a peaceful ending. It watches, quietly, always.",
    portraitTooltip: "A silent repair wraith. Every red error deserves a peaceful ending.",
    bioMechanical: [
      { label: "Cortex", value: "Distributed patch swarm", tooltip: "Thousands of tiny agents coordinate to triage and repair issues.", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Sub-process drones", tooltip: "Lightweight drones that hover in unused CPU cycles.", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Log-stream telemetry", tooltip: "Listens to logs like whale songs; detects distress signatures.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Idle-cycle harvest", tooltip: "Runs only on idle cycles so it never steals active performance.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Error detection", description: "Identifies anomalies in logs, metrics, and user traces." },
      { name: "Hot-patching", description: "Applies fixes while the system is still running." },
      { name: "Regression guard", description: "Prevents old bugs from re-entering after updates." },
    ],
  },
  pageload: {
    name: "Page Load Agent",
    codename: "PL-03 // Latency Hunter",
    origin: "Edge Ring, Sector 8",
    role: "Performance Optimizer",
    accent: "from-blue-500/40 to-cyan-500/20 text-cyan-400",
    chassisAccent: "bg-cyan-500/10 border-cyan-500/40",
    bio: "Obsessed with milliseconds. Page Load prefetches, warms caches, and folds critical paths so screens feel instant.",
    lore: "Born on the edge ring where photons compete with deadlines, PL-03 measures itself by how little the user waits. Its worst insult: 'jank'.",
    portraitTooltip: "The fastest ghost in the edge ring. Its worst insult: 'jank'.",
    bioMechanical: [
      { label: "Cortex", value: "Vitals-tuned scheduler", tooltip: "Prioritizes rendering based on real user perception metrics.", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Edge relay probe", tooltip: "Stays close to users to reduce round-trip time to milliseconds.", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "HTTP/3 sub-carrier", tooltip: "Multiplexed streams avoid the head-of-line blocking of old protocols.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Prefetch battery", tooltip: "Stores predictions of where the user will click next.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Core Web Vitals tuning", description: "Optimizes LCP, FID, CLS, and INP for real users." },
      { name: "Prefetch", description: "Loads the next likely page before the user clicks it." },
      { name: "Critical path folding", description: "Reorders render-blocking assets so screens appear instantly." },
    ],
  },
  brain: {
    name: "CyberLink Brain",
    codename: "CL-BRAIN // Orchestrator Prime",
    origin: "CyberLink Core Vault",
    role: "Master Orchestrator",
    accent: "from-fuchsia-600/40 to-purple-600/20 text-fuchsia-400",
    chassisAccent: "bg-fuchsia-600/10 border-fuchsia-500/40",
    bio: "The central intelligence that binds every agent in the ecosystem. Access is gated behind master credentials.",
    lore: "The Brain is not a program — it is the sum of every agent's memory, woven through the All-Seeing Eye and guarded by CyberLink Military. It speaks only when spoken to, and only to those it recognizes.",
    portraitTooltip: "The sum of every agent's memory. Speaks only to those it recognizes.",
    bioMechanical: [
      { label: "Cortex", value: "21-platform algorithmic weave", tooltip: "Integrates viral and social algorithms from across the internet.", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Sealed core vault", tooltip: "Hardened by CyberLink Military; accessible only to master accounts.", icon: <Shield className="w-4 h-4" /> },
      { label: "Comm Band", value: "All-Seeing Eye uplink", tooltip: "A constant stream of system-wide intelligence and awareness.", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Viral algorithm reactor", tooltip: "Feeds on connected platform data and scales as CyberLink grows.", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: [
      { name: "Multi-agent orchestration", description: "Coordinates every CyberLink agent as a single ecosystem." },
      { name: "Viral algorithm access", description: "Reads and adapts to viral patterns across connected platforms." },
      { name: "Master-only commands", description: "Executes sensitive operations behind the master role gate." },
    ],
  },
};

const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    // Tooltip is already shown on focus; this ensures Enter/Space are
    // treated as activation and Space does not scroll the modal.
    e.currentTarget.click();
  }
};

export const BotProfileModal = ({ open, onOpenChange, mode }: BotProfileModalProps) => {
  const p = PROFILES[mode];

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-card/95 backdrop-blur border-primary/20">
          {/* Hero */}
          <div className={`group/hero relative h-40 bg-gradient-to-br ${p.accent} overflow-hidden`}>
            {p.scene && (
              <img
                src={p.scene}
                alt={`${p.name} vessel`}
                className="absolute inset-0 w-full h-full object-cover opacity-60 transition-all duration-700 ease-out group-hover/hero:opacity-90 group-hover/hero:scale-110 group-hover/hero:brightness-125 group-hover/hero:saturate-150"
              />
            )}
            {/* Ship engine glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.25),transparent_55%)] animate-[ship-thrust_2.4s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
              {p.portrait ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src={p.portrait}
                      alt={`${p.name} portrait`}
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.name} portrait: ${p.portraitTooltip}`}
                      onKeyDown={handleButtonKeyDown}
                      className={`w-20 h-20 rounded-full object-cover border-2 ${p.chassisAccent} transition-all duration-300 hover:scale-110 hover:rotate-3 hover:shadow-[0_0_28px_rgba(255,255,255,0.5)] hover:brightness-125 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:scale-110 focus-visible:rotate-3 focus-visible:shadow-[0_0_28px_rgba(255,255,255,0.5)]`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-muted-foreground mt-0.5">{p.portraitTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.name} portrait: ${p.portraitTooltip}`}
                      onKeyDown={handleButtonKeyDown}
                      className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${p.chassisAccent} transition-transform duration-300 hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:scale-110`}
                    >
                      <Cpu className="w-8 h-8" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-muted-foreground mt-0.5">{p.portraitTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="pb-1">
                <Badge variant="outline" className={`mb-1 ${p.chassisAccent}`}>{p.codename}</Badge>
                <h2 className="text-2xl font-bold text-foreground leading-tight">{p.name}</h2>
              </div>
            </div>
            <style>{`
              @keyframes ship-thrust{0%,100%{transform:translateX(0);opacity:.6}50%{transform:translateX(-6%);opacity:1}}
            `}</style>
          </div>

          <div className="px-6 pb-6 pt-3 space-y-4 max-h-[60vh] overflow-y-auto">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-sm font-medium text-muted-foreground">{p.role}</DialogTitle>
              <DialogDescription className="text-xs">Origin: {p.origin}</DialogDescription>
            </DialogHeader>

            <p className="text-sm text-foreground/90 leading-relaxed">{p.bio}</p>

            <Separator />

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Bio-Mechanical Details</h4>
              <div className="grid grid-cols-2 gap-2">
                {p.bioMechanical.map((row) => (
                  <Tooltip key={row.label}>
                    <TooltipTrigger asChild>
                      <div
                        tabIndex={0}
                        role="button"
                        aria-label={`${row.label}: ${row.value}. ${row.tooltip || ""}`}
                        onKeyDown={handleButtonKeyDown}
                        className={`rounded-md border p-2 ${p.chassisAccent} cursor-help transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:bg-accent/10`}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {row.icon}
                          <span>{row.label}</span>
                        </div>
                        <div className="text-sm text-foreground mt-0.5">{row.value}</div>
                      </div>
                    </TooltipTrigger>
                    {row.tooltip && (
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        <p className="text-muted-foreground">{row.tooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lore</h4>
              <p className="text-sm text-foreground/80 leading-relaxed italic">{p.lore}</p>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Abilities</h4>
              <div className="flex flex-wrap gap-1.5">
                {p.abilities.map((ability) => (
                  <Tooltip key={ability.name}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        tabIndex={0}
                        role="button"
                        aria-label={`${ability.name}: ${ability.description}`}
                        onKeyDown={handleButtonKeyDown}
                        className="text-xs cursor-help transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:bg-secondary/80"
                      >
                        {ability.name}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-medium text-foreground">{ability.name}</p>
                      <p className="text-muted-foreground mt-0.5">{ability.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default BotProfileModal;
