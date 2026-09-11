import { ReactNode, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  User,
  Radio,
  Gamepad2,
  Globe,
  DollarSign,
  Brain,
  Shield,
  Image as ImageIcon,
  PlusSquare,
  Link2,
  BadgeCheck,
  Orbit,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RightRail from "@/components/layout/RightRail";
import AllSeeingEye from "@/components/space/AllSeeingEye";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
}

const primaryNav: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Studio", url: "/studio", icon: Radio },
  { title: "Arena", url: "/cyber-arena", icon: Gamepad2 },
  { title: "CyberWorld", url: "/cyber-world", icon: Globe },
  { title: "Monetization", url: "/monetization", icon: DollarSign },
  { title: "Backgrounds", url: "/backgrounds", icon: ImageIcon },
  { title: "AI Ecosystem", url: "/ai-ecosystem", icon: Brain },
  { title: "Security", url: "/security", icon: Shield },
];

const mobileNav: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Arena", url: "/cyber-arena", icon: Gamepad2 },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", url: "/profile", icon: User },
];

interface AppShellProps {
  children: ReactNode;
  /** Content for the right rail. Defaults to the standard discovery rail. */
  rightRail?: ReactNode;
  onCreatePost?: () => void;
  /** Sticky sub-header rendered above the scrolling feed (e.g. tabs). */
  centerHeader?: ReactNode;
}

const scrollPositions = new Map<string, number>();

const AppShell = ({ children, rightRail, onCreatePost, centerHeader }: AppShellProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { desktop, toggleDesktop } = useFloatingWindowsContext();
  const onSpaceDesktop = desktop === "space";

  // Restore the centre column scroll position per route, and remember it on leave.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollPositions.get(pathname) ?? 0;
    const onScroll = () => scrollPositions.set(pathname, el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollPositions.set(pathname, el.scrollTop);
      el.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-transparent">
      {/* Fixed top header */}
      <header className="h-16 shrink-0 z-40 border-b border-border/60 bg-card/60 backdrop-blur-xl">
        <div className="w-full h-full px-4 sm:px-5 lg:px-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0"
            aria-label="Cyber Link home"
          >
            <Link2 className="w-7 h-7 text-primary text-glow" />
            <span className="text-xl font-bold text-primary text-glow hidden sm:inline">Cyber Link</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:text-primary"
              title="Get verified"
              onClick={() => navigate("/verification")}
            >
              <BadgeCheck className="w-5 h-5" />
            </Button>
            {onCreatePost && (
              <Button onClick={onCreatePost} className="gap-2 glow-primary">
                <PlusSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Post</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:text-primary"
              title="My profile"
              onClick={() => navigate("/profile")}
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:text-accent"
              title={onSpaceDesktop ? "Back to main desktop" : "Solar system desktop"}
              aria-label={onSpaceDesktop ? "Back to main desktop" : "Solar system desktop"}
              aria-pressed={onSpaceDesktop}
              onClick={toggleDesktop}
            >
              {onSpaceDesktop ? <MonitorSmartphone className="w-5 h-5" /> : <Orbit className="w-5 h-5" />}
            </Button>
            <AllSeeingEye />
          </div>
        </div>
      </header>

      {/* Three column body */}
      <div
        className={cn(
          "flex-1 min-h-0 w-full flex gap-0 lg:gap-6 px-0 md:px-4 lg:px-5 overflow-x-hidden",
          onSpaceDesktop && "hidden",
        )}
      >
        {/* Left sidebar — fluid, collapses to icons on smaller screens */}
        <aside className="hidden md:flex md:w-[6%] md:min-w-[68px] xl:w-[18%] xl:min-w-[200px] xl:max-w-[280px] shrink-0 flex-col overflow-y-auto overscroll-contain py-4 border-r border-border/40 bg-card/35 backdrop-blur-xl [scrollbar-gutter:stable]">
          <nav className="flex flex-col gap-1 px-2">
            {primaryNav.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "justify-center xl:justify-start",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )
                }
                title={item.title}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="hidden xl:inline">{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Centre column — the only scrolling region on desktop */}
        <div className="flex-1 min-w-0 flex flex-col">
          {centerHeader && (
            <div className="shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-xl">
              {centerHeader}
            </div>
          )}
          <main
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10"
          >
            <div className="w-full">{children}</div>
          </main>
        </div>

        {/* Right sidebar — fluid */}
        <aside className="hidden lg:block w-[24%] min-w-[260px] max-w-[380px] shrink-0 overflow-y-auto overscroll-contain py-6 border-l border-border/40 bg-card/35 backdrop-blur-xl px-4 [scrollbar-gutter:stable]">
          {rightRail ?? <RightRail />}
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className={cn(onSpaceDesktop && "hidden", "md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border/60 bg-card/80 backdrop-blur-xl flex items-center justify-around")}>
        {mobileNav.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 text-[11px] px-3 py-1.5 rounded-md",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.title}
          </NavLink>
        ))}
        {onCreatePost && (
          <button
            onClick={onCreatePost}
            className="flex flex-col items-center gap-0.5 text-[11px] text-primary px-3 py-1.5"
          >
            <PlusSquare className="w-5 h-5" />
            Post
          </button>
        )}
      </nav>
    </div>
  );
};

export default AppShell;
