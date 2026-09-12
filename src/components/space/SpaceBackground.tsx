import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden bg-black">
      {/* Pure black base — every layer above dissolves into it. */}
      <div className="absolute inset-0 bg-black" />

      {render3d && (
        <Suspense fallback={null}>
          <SpaceScene full={full} animate={visible && !reduced} view={view} cameraMode={camera} tier={tier} />
        </Suspense>
      )}

      <div className="space-depth-light absolute inset-0" />
      <div className="space-depth-haze absolute inset-0" />
      <div className="space-depth-grain absolute inset-0" />

      {/* Dim veil + vignette keep text and feed content fully legible on top. */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500"
        style={{ opacity: Math.min(1, Math.max(0, dim)) }}
      />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_50%_45%,transparent_32%,rgba(0,0,0,0.55)_80%,#000_100%)]" />
    </div>
  );
};

export default SpaceBackground;
