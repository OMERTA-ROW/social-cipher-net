import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Gamepad2,
  Home,
  Radio,
  Trophy,
  Save,
  Users,
  Plug,
  Clapperboard,
} from "lucide-react";

export interface ArenaSection {
  id: string;
  label: string;
  icon: ReactNode;
}

interface ArenaShellProps {
  sections: ArenaSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  /** Command bar slot — search, quick launchers. */
  commandBar?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}

const EXITS = [
  { label: "Home", to: "/", icon: <Home className="w-4 h-4" /> },
  { label: "Studio", to: "/studio", icon: <Radio className="w-4 h-4" /> },
  { label: "Theater", to: "/theater", icon: <Clapperboard className="w-4 h-4" /> },
  { label: "Connectors", to: "/connectors", icon: <Plug className="w-4 h-4" /> },
];

/**
 * Arena runs in its own full-bleed HUD environment instead of the standard
 * page shell: a command deck across the top, a vertical section rail on the
 * left, and a single scrolling arena floor.
 */
const ArenaShell = ({
  sections,
  activeSection,
  onSectionChange,
  commandBar,
  status,
  children,
}: ArenaShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Command deck */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-primary/25 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0"
            aria-label="CyberLink Arena home"
          >
            <Gamepad2 className="w-7 h-7 text-primary text-glow" />
            <span className="hidden sm:block text-lg font-bold text-primary text-glow tracking-wide">
              ARENA
            </span>
          </button>

          <div className="flex-1 min-w-0">{commandBar}</div>

          <div className="hidden md:flex items-center gap-1 shrink-0">
            {EXITS.map((exit) => (
              <Button
                key={exit.to}
                size="sm"
                variant="ghost"
                onClick={() => navigate(exit.to)}
                className={cn(
                  "gap-2 text-muted-foreground hover:text-primary",
                  location.pathname === exit.to && "text-primary",
                )}
              >
                {exit.icon}
                <span className="hidden lg:inline">{exit.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {status && (
          <div className="px-4 pb-2 flex flex-wrap items-center gap-2">{status}</div>
        )}
      </header>

      {/* Section rail */}
      <nav
        className="fixed left-0 top-[64px] bottom-0 z-30 hidden md:flex flex-col gap-1 w-[76px] lg:w-[196px] border-r border-primary/20 bg-background/70 backdrop-blur-md py-4 px-2 overflow-y-auto"
        aria-label="Arena sections"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors border border-transparent",
              "text-muted-foreground hover:text-primary hover:border-primary/30",
              activeSection === section.id &&
                "text-primary border-primary/50 bg-primary/5",
            )}
            aria-current={activeSection === section.id ? "page" : undefined}
          >
            <span className="shrink-0">{section.icon}</span>
            <span className="hidden lg:inline truncate">{section.label}</span>
          </button>
        ))}
      </nav>

      {/* Arena floor */}
      <main className="pt-[112px] md:pt-[96px] pb-24 md:pb-8 md:pl-[84px] lg:pl-[204px] px-4">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5 border-b border-primary/20 pb-4">
            <h1 className="hologram-title text-3xl font-bold sm:text-4xl">Cyber Arena</h1>
            <p className="mt-1 text-sm text-muted-foreground">Organize saved tools, token pools, and your gaming network.</p>
          </header>
          {children}
        </div>
      </main>

      {/* Mobile section bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-primary/25 bg-background/90 backdrop-blur-md flex overflow-x-auto"
        aria-label="Arena sections"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
              activeSection === section.id && "text-primary",
            )}
          >
            {section.icon}
            <span className="truncate w-full text-center">{section.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export const ArenaStatusChip = ({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "live";
}) => (
  <Badge
    variant={tone === "live" ? "destructive" : "outline"}
    className={cn("text-[11px]", tone === "live" && "animate-pulse")}
  >
    {tone === "live" ? <Radio className="w-3 h-3 mr-1" /> : null}
    {label}
  </Badge>
);

export const ARENA_ICONS = { Trophy, Save, Users, Gamepad2 };

export default ArenaShell;
