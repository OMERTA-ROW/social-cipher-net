import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { isLowPowerDevice, prefersReducedMotion, resolveQuality, useSpaceBgSettings } from "@/lib/spaceBackgroundSettings";

const SpaceScene = lazy(() => import("./scene/SpaceScene"));

/**
 * Fixed, full-screen procedural space background. Sits behind every route,
 * never receives pointer events, and pauses whenever the tab is hidden.
 * Everything is generated in code — no image assets, so there are no seams.
 */
const SpaceBackground = () => {
  const { mode, dim, view, camera, quality } = useSpaceBgSettings();
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const lowPower = useMemo(isLowPowerDevice, []);
  const tier = useMemo(() => resolveQuality(quality), [quality]);
  const [shipTarget, setShipTarget] = useState({ x: 0, y: 0, visible: false });

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const onShipPosition = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number; visible: boolean }>).detail;
      if (detail) setShipTarget(detail);
    };
    window.addEventListener("cyberlink:ship-position", onShipPosition);
    return () => window.removeEventListener("cyberlink:ship-position", onShipPosition);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const render3d = mode !== "off";
  const full = mode === "full" && !lowPower && !reduced;

  return (
    <>
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden bg-black">
      {/* Pure black base — every layer above dissolves into it. */}
      <div className="absolute inset-0 bg-black" />

      {render3d && (
        <Suspense fallback={null}>
          <SpaceScene full={full} animate={visible && !reduced} view={view} cameraMode={camera} tier={tier} />
        </Suspense>
      )}

      {/* Dim veil + vignette keep text and feed content fully legible on top. */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500"
        style={{ opacity: Math.min(1, Math.max(0, dim)) }}
      />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_50%_45%,transparent_32%,rgba(0,0,0,0.55)_80%,#000_100%)]" />
    </div>
    {render3d && view === "solar" && shipTarget.visible && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="fixed z-30 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 bg-background/10 text-primary/70 backdrop-blur-[1px] hover:border-primary/70 hover:bg-primary/10 hover:text-primary"
        style={{ left: shipTarget.x, top: shipTarget.y }}
        onClick={() => window.dispatchEvent(new CustomEvent("cyberlink:open-ship-interface"))}
        aria-label="Open spaceship crew interface"
        title="Open Zozo, Draco, and miners"
      >
        <Rocket className="h-4 w-4" />
      </Button>
    )}
    </>
  );
};

export default SpaceBackground;
