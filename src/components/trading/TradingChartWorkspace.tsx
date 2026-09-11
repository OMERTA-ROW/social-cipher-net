import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChartPane, { type PaneConfig } from "./ChartPane";
import type { TradingLimits } from "@/lib/tradingTiers";

interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  z: number;
}

interface Props {
  panes: PaneConfig[];
  limits: TradingLimits;
  onChange: (pane: PaneConfig) => void;
  onRemove: (id: string) => void;
  onUpgradeNeeded: (reason: string) => void;
}

const STORAGE_KEY = "cyberlink:trading-chart-windows";
const MIN_WIDTH = 320;
const MIN_HEIGHT = 310;

const readSaved = (): Record<string, Geometry> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, Geometry>;
  } catch {
    return {};
  }
};

const defaultGeometry = (index: number): Geometry => ({
  x: (index % 2) * 520,
  y: Math.floor(index / 2) * 390,
  width: 500,
  height: 370,
  pinned: false,
  z: index + 1,
});

const TradingChartWorkspace = ({ panes, limits, onChange, onRemove, onUpgradeNeeded }: Props) => {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [geometry, setGeometry] = useState<Record<string, Geometry>>(readSaved);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 768);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setGeometry((current) => {
      const next = { ...current };
      panes.forEach((pane, index) => {
        if (!next[pane.id]) next[pane.id] = defaultGeometry(index);
      });
      Object.keys(next).forEach((id) => {
        if (!panes.some((pane) => pane.id === id)) delete next[id];
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [panes]);

  const updateGeometry = useCallback((id: string, patch: Partial<Geometry>) => {
    setGeometry((current) => {
      const next = { ...current, [id]: { ...(current[id] ?? defaultGeometry(0)), ...patch } };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !workspaceRef.current) return;
      const current = geometry[drag.id];
      if (!current) return;
      const maxX = Math.max(0, workspaceRef.current.scrollWidth - current.width);
      updateGeometry(drag.id, {
        x: Math.max(0, Math.min(maxX, drag.x + event.clientX - drag.startX)),
        y: Math.max(0, drag.y + event.clientY - drag.startY),
      });
    };
    const end = () => {
      dragRef.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, [geometry, updateGeometry]);

  const canvasHeight = useMemo(
    () => Math.max(430, ...panes.map((pane, index) => {
      const item = geometry[pane.id] ?? defaultGeometry(index);
      return item.y + item.height + 24;
    })),
    [geometry, panes],
  );

  if (compact) {
    return (
      <div className="grid grid-cols-1 gap-3 overflow-x-hidden">
        {panes.map((pane) => (
          <ChartPane
            key={pane.id}
            pane={pane}
            limits={limits}
            height={280}
            pinned={geometry[pane.id]?.pinned ?? false}
            onPin={() => updateGeometry(pane.id, { pinned: !(geometry[pane.id]?.pinned ?? false) })}
            onChange={onChange}
            onRemove={() => onRemove(pane.id)}
            onUpgradeNeeded={onUpgradeNeeded}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-auto scroll-smooth rounded-md border border-border/60 bg-background/20">
      <div ref={workspaceRef} className="relative min-w-[1040px]" style={{ height: canvasHeight }}>
        {panes.map((pane, index) => {
          const item = geometry[pane.id] ?? defaultGeometry(index);
          return (
            <div
              key={pane.id}
              className={`absolute overflow-hidden ${item.pinned ? "ring-1 ring-primary/60" : "resize"}`}
              style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.z, minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT }}
              onPointerDown={() => updateGeometry(pane.id, { z: Math.max(...Object.values(geometry).map((g) => g.z), 0) + 1 })}
              ref={(element) => {
                if (!element || item.pinned) return;
                const observer = new ResizeObserver(([entry]) => {
                  const width = Math.max(MIN_WIDTH, Math.round(entry.contentRect.width));
                  const height = Math.max(MIN_HEIGHT, Math.round(entry.contentRect.height));
                  if (width !== item.width || height !== item.height) updateGeometry(pane.id, { width, height });
                });
                observer.observe(element);
                return () => observer.disconnect();
              }}
            >
              <ChartPane
                pane={pane}
                limits={limits}
                height={Math.max(210, item.height - 112)}
                pinned={item.pinned}
                onPin={() => updateGeometry(pane.id, { pinned: !item.pinned })}
                onDragStart={(event) => {
                  if (item.pinned) return;
                  event.preventDefault();
                  dragRef.current = { id: pane.id, startX: event.clientX, startY: event.clientY, x: item.x, y: item.y };
                  document.body.style.userSelect = "none";
                }}
                onChange={onChange}
                onRemove={() => onRemove(pane.id)}
                onUpgradeNeeded={onUpgradeNeeded}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradingChartWorkspace;