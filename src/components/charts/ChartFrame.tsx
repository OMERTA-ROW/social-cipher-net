/**
 * Shared, accessible container for every chart on the site.
 *
 * Gives each chart the same size controls: drag handle, keyboard-operated
 * smaller/larger/reset buttons and an expanded full-screen view (Escape closes
 * it and focus returns to the trigger, handled by the dialog primitive).
 * The chosen height is remembered per chart in this browser only — it is a
 * device preference and never mixed with account data.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CHART_DEFAULT_HEIGHT,
  CHART_MAX_HEIGHT,
  CHART_MIN_HEIGHT,
  CHART_STEP,
  clampChartHeight,
  clearChartHeight,
  readChartHeight,
  responsiveChartHeight,
  stepChartHeight,
  writeChartHeight,
} from "@/lib/chartSize";

interface ChartFrameProps {
  /** Stable id — the size preference is stored against it. */
  id: string;
  title?: string;
  /** Extra controls rendered to the left of the size buttons. */
  toolbar?: ReactNode;
  /** Rendered with the height the chart should draw at. */
  children: (height: number) => ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  /** Fill the parent instead of owning a fixed height (floating windows). */
  fill?: boolean;
  className?: string;
}

const ChartFrame = ({
  id,
  title,
  toolbar,
  children,
  defaultHeight = CHART_DEFAULT_HEIGHT,
  minHeight = CHART_MIN_HEIGHT,
  maxHeight = CHART_MAX_HEIGHT,
  fill = false,
  className = "",
}: ChartFrameProps) => {
  const [stored, setStored] = useState(() => readChartHeight(id, defaultHeight));
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined" ? 900 : window.innerHeight,
  );
  const [expanded, setExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(520);
  const [fillHeight, setFillHeight] = useState(defaultHeight);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  // Keep the chart bounded to the window on every device.
  useEffect(() => {
    const onResize = () => setViewport(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // In fill mode the parent decides the size; a ResizeObserver reflows the chart.
  useLayoutEffect(() => {
    if (!fill || !fillRef.current) return;
    const el = fillRef.current;
    const ro = new ResizeObserver(() => {
      setFillHeight(Math.max(minHeight, Math.round(el.clientHeight)));
    });
    ro.observe(el);
    setFillHeight(Math.max(minHeight, Math.round(el.clientHeight || defaultHeight)));
    return () => ro.disconnect();
  }, [fill, minHeight, defaultHeight]);

  useLayoutEffect(() => {
    if (!expanded || !expandedRef.current) return;
    const el = expandedRef.current;
    const ro = new ResizeObserver(() => setExpandedHeight(Math.max(240, el.clientHeight)));
    ro.observe(el);
    setExpandedHeight(Math.max(240, el.clientHeight || 520));
    return () => ro.disconnect();
  }, [expanded]);

  const bounded = responsiveChartHeight(
    clampChartHeight(stored, minHeight, maxHeight),
    viewport,
    minHeight,
  );

  const apply = useCallback(
    (next: number) => {
      const value = clampChartHeight(next, minHeight, maxHeight);
      setStored(value);
      writeChartHeight(id, value);
    },
    [id, minHeight, maxHeight],
  );

  const reset = () => {
    clearChartHeight(id);
    setStored(defaultHeight);
  };

  // Pointer drag on the bottom handle.
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = bounded;
    const move = (e: PointerEvent) => apply(startHeight + (e.clientY - startY));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const onHandleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      apply(stepChartHeight(bounded, event.key === "ArrowDown" ? 1 : -1, minHeight, maxHeight));
    }
    if (event.key === "Home") {
      event.preventDefault();
      reset();
    }
  };

  const controls = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {!fill && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-primary"
                  onClick={() => apply(stepChartHeight(bounded, -1, minHeight, maxHeight))}
                  disabled={bounded <= minHeight}
                  aria-label={`Make ${title ?? "chart"} shorter`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shorter ({CHART_STEP}px)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-primary"
                  onClick={() => apply(stepChartHeight(bounded, 1, minHeight, maxHeight))}
                  aria-label={`Make ${title ?? "chart"} taller`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Taller ({CHART_STEP}px)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-primary"
                  onClick={reset}
                  aria-label={`Reset ${title ?? "chart"} size`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset size</TooltipContent>
            </Tooltip>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:text-primary"
              onClick={() => setExpanded(true)}
              aria-label={`Expand ${title ?? "chart"} to full screen`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Expand (Esc to close)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <div className={`flex min-w-0 flex-col ${fill ? "h-full" : ""} ${className}`}>
      {(title || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {title && <span className="text-xs font-medium text-muted-foreground">{title}</span>}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {controls}
          </div>
        </div>
      )}
      {!title && !toolbar && <div className="flex justify-end pb-1">{controls}</div>}

      {fill ? (
        <div ref={fillRef} className="min-h-0 w-full flex-1 overflow-hidden">
          {children(fillHeight)}
        </div>
      ) : (
        <>
          <div className="w-full overflow-hidden" style={{ height: bounded }}>
            {children(bounded)}
          </div>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={`Resize ${title ?? "chart"}. Use the up and down arrow keys.`}
            aria-valuenow={bounded}
            aria-valuemin={minHeight}
            aria-valuemax={maxHeight}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={onHandleKey}
            className="mx-auto mt-1 flex h-3 w-24 cursor-ns-resize touch-none items-center justify-center rounded-full bg-border/60 outline-none transition-colors hover:bg-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="h-0.5 w-10 rounded-full bg-foreground/40" />
          </div>
        </>
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-2 p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">{title ?? "Chart"}</DialogTitle>
          </DialogHeader>
          <div ref={expandedRef} className="min-h-0 w-full flex-1 overflow-hidden">
            {expanded && children(expandedHeight)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChartFrame;
