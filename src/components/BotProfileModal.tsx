import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  bioMechanical: { label: string; value: string; icon: React.ReactNode }[];
  abilities: string[];
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
    bioMechanical: [
      { label: "Cortex", value: "Coral-lace neural weave", icon: <Dna className="w-4 h-4" /> },
      { label: "Vessel", value: "Grown organic cruiser", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Sub-cyan harmonic", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Bioluminescent plasma", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Content ideation", "Auto-thread posting", "Voice reply", "Trend forecasting"],
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
    bioMechanical: [
      { label: "Cortex", value: "Reptilian tactical lattice", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Armored warship, twin cannons", icon: <Shield className="w-4 h-4" /> },
      { label: "Comm Band", value: "Encrypted crimson pulse", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Magma-fed fusion cell", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Market analysis", "Risk defense", "Auto-hedge", "Arena strike commands"],
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
    bioMechanical: [
      { label: "Cortex", value: "Non-collapsing qubit mesh", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Phase-shifted shell", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Cross-branch entanglement", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Vacuum energy tap", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Predictive modeling", "Parallel branching", "Anomaly detection"],
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
    bioMechanical: [
      { label: "Cortex", value: "Distributed patch swarm", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Sub-process drones", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "Log-stream telemetry", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Idle-cycle harvest", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Error detection", "Hot-patching", "Regression guard"],
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
    bioMechanical: [
      { label: "Cortex", value: "Vitals-tuned scheduler", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Edge relay probe", icon: <Rocket className="w-4 h-4" /> },
      { label: "Comm Band", value: "HTTP/3 sub-carrier", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Prefetch battery", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Core Web Vitals tuning", "Prefetch", "Critical path folding"],
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
    bioMechanical: [
      { label: "Cortex", value: "21-platform algorithmic weave", icon: <Cpu className="w-4 h-4" /> },
      { label: "Vessel", value: "Sealed core vault", icon: <Shield className="w-4 h-4" /> },
      { label: "Comm Band", value: "All-Seeing Eye uplink", icon: <Radio className="w-4 h-4" /> },
      { label: "Power Core", value: "Viral algorithm reactor", icon: <Zap className="w-4 h-4" /> },
    ],
    abilities: ["Multi-agent orchestration", "Viral algorithm access", "Master-only commands"],
  },
};

export const BotProfileModal = ({ open, onOpenChange, mode }: BotProfileModalProps) => {
  const p = PROFILES[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card/95 backdrop-blur border-primary/20">
        {/* Hero */}
        <div className={`relative h-40 bg-gradient-to-br ${p.accent}`}>
          {p.scene && (
            <img
              src={p.scene}
              alt={`${p.name} vessel`}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
            {p.portrait ? (
              <img
                src={p.portrait}
                alt={`${p.name} portrait`}
                className={`w-20 h-20 rounded-full object-cover border-2 ${p.chassisAccent}`}
              />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${p.chassisAccent}`}>
                <Cpu className="w-8 h-8" />
              </div>
            )}
            <div className="pb-1">
              <Badge variant="outline" className={`mb-1 ${p.chassisAccent}`}>{p.codename}</Badge>
              <h2 className="text-2xl font-bold text-foreground leading-tight">{p.name}</h2>
            </div>
          </div>
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
                <div key={row.label} className={`rounded-md border p-2 ${p.chassisAccent}`}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {row.icon}
                    <span>{row.label}</span>
                  </div>
                  <div className="text-sm text-foreground mt-0.5">{row.value}</div>
                </div>
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
              {p.abilities.map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotProfileModal;
