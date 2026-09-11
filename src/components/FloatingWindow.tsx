import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Minus, Maximize2, GripVertical, Orbit, MonitorSmartphone, Pin, PinOff } from "lucide-react";
import type { WindowWorkspace } from "@/hooks/useFloatingWindows";

interface FloatingWindowProps {
  id: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
  width?: number;
  height?: number;
  /** Which desktop this window currently lives on. */
  workspace?: WindowWorkspace;
  /** Move the window between the main interface and the solar system desktop. */
  onToggleWorkspace?: () => void;
}

interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 180;

const storageKey = (title: string, workspace: WindowWorkspace) =>
  workspace === "space" ? `cyberlink:window:space:${title}` : `cyberlink:window:${title}`;

const readPlacement = (title: string, workspace: WindowWorkspace): Placement | null => {
  try {
    const raw = localStorage.getItem(storageKey(title, workspace));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Placement>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return null;
    }
    return parsed as Placement;
  } catch {
    return null;
  }
};

const pinKey = (title: string, workspace: WindowWorkspace) => `${storageKey(title, workspace)}:pinned`;

const readPinned = (title: string, workspace: WindowWorkspace): boolean => {
  try {
    return localStorage.getItem(pinKey(title, workspace)) === "1";
  } catch {
    return false;
  }
};

const clampToViewport = (p: Placement): Placement => {
  const maxX = Math.max(0, window.innerWidth - 120);
  const maxY = Math.max(0, window.innerHeight - 60);
  return {
    width: Math.max(MIN_WIDTH, Math.min(p.width, window.innerWidth)),
    height: Math.max(MIN_HEIGHT, p.height),
    x: Math.min(Math.max(0, p.x), maxX),
    y: Math.min(Math.max(0, p.y), maxY),
  };
};

export default function FloatingWindow({
  id,
  title,
  children,
  onClose,
  initialX = 100,
  initialY = 100,
  width = 600,
  height = 400,
  workspace = "main",
  onToggleWorkspace,
}: FloatingWindowProps) {
  const [placement, setPlacement] = useState<Placement>(() =>
    clampToViewport(
      readPlacement(title, workspace) ?? { x: initialX, y: initialY, width, height },
    ),
  );
  const [isMinimized, setIsMinimized] = useState(false);
  const [pinned, setPinned] = useState(() => readPinned(title, workspace));
  const [mode, setMode] = useState<"idle" | "drag" | "resize">("idle");
  const gesture = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, originW: 0, originH: 0 });

  // A pinned window stays exactly where the user parked it.
  useEffect(() => {
    setPinned(readPinned(title, workspace));
  }, [title, workspace]);

  const togglePin = () => {
    setPinned((current) => {
      const next = !current;
      try {
        localStorage.setItem(pinKey(title, workspace), next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // Remember where the user placed this window.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(title, workspace), JSON.stringify(placement));
    } catch {
      /* storage unavailable — placement simply is not remembered */
    }
  }, [title, workspace, placement]);

  // When a window moves to another desktop, restore the spot it had there.
  useEffect(() => {
    const remembered = readPlacement(title, workspace);
    if (remembered) setPlacement(clampToViewport(remembered));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  const startGesture = (clientX: number, clientY: number, next: "drag" | "resize") => {
    if (pinned) return;
    gesture.current = {
      startX: clientX,
      startY: clientY,
      originX: placement.x,
      originY: placement.y,
      originW: placement.width,
      originH: placement.height,
    };
    setMode(next);
  };

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const g = gesture.current;
      const dx = clientX - g.startX;
      const dy = clientY - g.startY;
      if (mode === "drag") {
        setPlacement((p) => ({
          ...p,
          x: Math.min(Math.max(0, g.originX + dx), Math.max(0, window.innerWidth - 120)),
          y: Math.min(Math.max(0, g.originY + dy), Math.max(0, window.innerHeight - 60)),
        }));
      } else if (mode === "resize") {
        setPlacement((p) => ({
          ...p,
          width: Math.max(MIN_WIDTH, g.originW + dx),
          height: Math.max(MIN_HEIGHT, g.originH + dy),
        }));
      }
    },
    [mode],
  );

  useEffect(() => {
    if (mode === "idle") return;
    const move = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onPointerMove(t.clientX, t.clientY);
      e.preventDefault();
    };
    const end = () => setMode("idle");
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", end);
    };
  }, [mode, onPointerMove]);

  return (
    <div
      className="fixed z-50 shadow-2xl"
      style={{
        left: `${placement.x}px`,
        top: `${placement.y}px`,
        width: isMinimized ? "300px" : `${placement.width}px`,
        height: isMinimized ? "auto" : `${placement.height}px`,
        pointerEvents: "auto",
        userSelect: mode === "idle" ? undefined : "none",
      }}
    >
      <Card
        className={`h-full flex flex-col border-2 bg-background/95 backdrop-blur-sm ${
          pinned ? "border-accent/50" : "border-primary/20"
        }`}
      >
        <CardHeader
          className={`border-b bg-muted/30 py-2 px-4 touch-none ${pinned ? "cursor-default" : "cursor-move"}`}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            startGesture(e.clientX, e.clientY, "drag");
          }}
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            const t = e.touches[0];
            if (t) startGesture(t.clientX, t.clientY, "drag");
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {onToggleWorkspace && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:text-accent"
                  onClick={onToggleWorkspace}
                  title={workspace === "space" ? "Bring back to main desktop" : "Send out to the solar system desktop"}
                  aria-label={workspace === "space" ? "Bring back to main desktop" : "Send out to the solar system desktop"}
                >
                  {workspace === "space" ? <MonitorSmartphone className="h-3 w-3" /> : <Orbit className="h-3 w-3" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimise"}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={onClose}
                title="Close"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-4 overflow-auto">{children}</CardContent>
            <div
              role="presentation"
              aria-label="Resize"
              className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize touch-none"
              style={{
                background:
                  "linear-gradient(135deg, transparent 50%, hsl(var(--primary) / 0.5) 50%)",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                startGesture(e.clientX, e.clientY, "resize");
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const t = e.touches[0];
                if (t) startGesture(t.clientX, t.clientY, "resize");
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
