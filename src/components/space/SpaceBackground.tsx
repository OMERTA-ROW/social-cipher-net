import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { Region } from "./SolarSystemScene";
import { isLowPowerDevice, prefersReducedMotion, useSpaceBgSettings } from "@/lib/spaceBackgroundSettings";

const SolarSystemScene = lazy(() => import("./SolarSystemScene"));

/** Different routes = different regions of space (camera anchor + local nebula colour). */
const REGIONS: Region[] = [
  { anchor: [0, 34, 104], nebulaHue: 215, drift: 1 },
  { anchor: [46, 22, 96], nebulaHue: 285, drift: 0.85 },
  { anchor: [-52, 40, 88], nebulaHue: 190, drift: 1.15 },
  { anchor: [20, -26, 118], nebulaHue: 330, drift: 0.7 },
  { anchor: [-30, 48, 126], nebulaHue: 45, drift: 0.9 },
];

const regionFor = (pathname: string): Region => {
  let h = 0;
  for (let i = 0; i < pathname.length; i++) h = (h * 31 + pathname.charCodeAt(i)) >>> 0;
  return REGIONS[h % REGIONS.length];
};

/**
 * Fixed, full-screen animated space background. Sits behind every route,
 * never receives pointer events, and pauses whenever the tab is hidden.
 */
const SpaceBackground = () => {
  const { pathname } = useLocation();
  const { mode, dim } = useSpaceBgSettings();
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const region = useMemo(() => regionFor(pathname), [pathname]);
  const lowPower = useMemo(isLowPowerDevice, []);

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

  const featherMask =
    "radial-gradient(ellipse 82% 78% at 50% 48%, #000 55%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0) 100%)";

  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden bg-black">
      {/* Pure black base so every layer above can blend into it seamlessly. */}
      <div className="absolute inset-0 bg-black" />

      {/* Soft nebula haze, feathered into the black with a radial mask. */}
      <div
        className="absolute inset-0 opacity-60 [background:radial-gradient(ellipse_at_20%_15%,hsl(265_60%_18%/0.9),transparent_55%),radial-gradient(ellipse_at_80%_70%,hsl(200_70%_16%/0.85),transparent_55%)]"
        style={{
          mixBlendMode: "screen",
          maskImage: featherMask,
          WebkitMaskImage: featherMask,
        }}
      />

      {/* Crisp point stars with gentle twinkle, layered above the haze. */}
      <div className="absolute inset-0 star-layer star-layer-far" />
      <div className="absolute inset-0 star-layer star-layer-near" />

      {render3d && (
        <div
          className="absolute inset-0"
          style={{
            mixBlendMode: "screen",
            maskImage: featherMask,
            WebkitMaskImage: featherMask,
          }}
        >
          <Canvas
            className="absolute inset-0"
            shadows={full ? "soft" : false}
            gl={{ antialias: false, powerPreference: "low-power", alpha: false }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.15;
            }}
            dpr={full ? [1, 1.75] : 1}
            camera={{ position: [0, 34, 104], fov: 55, near: 0.5, far: 1200 }}
            frameloop={visible && !reduced ? "always" : "demand"}
          >
            <Suspense fallback={null}>
              <SolarSystemScene full={full} region={region} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Dim veil + vignette keep text and feed content fully legible on top. */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500"
        style={{ opacity: Math.min(1, Math.max(0, dim)) }}
      />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_50%_45%,transparent_30%,rgba(0,0,0,0.6)_78%,#000_100%)]" />
      <div className="absolute inset-0 [background:linear-gradient(90deg,#000,transparent_20%,transparent_80%,#000)]" />
      <div className="absolute inset-0 [background:linear-gradient(180deg,#000,transparent_16%,transparent_84%,#000)]" />
    </div>
  );

};

export default SpaceBackground;
