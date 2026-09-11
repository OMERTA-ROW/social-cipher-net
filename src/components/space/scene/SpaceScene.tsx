import { Canvas } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useEffect, useState } from "react";
import CameraRig from "./CameraRig";
import Galaxy from "./Galaxy";
import MarketComets from "./MarketComets";
import Planets from "./Planets";
import StarTrails from "./StarTrails";
import Starfield from "./Starfield";
import { marketPulse, useMarketPulse } from "./useMarketPulse";
import MiningWorld from "./MiningWorld";
import ShipChaseCamera from "./ShipChaseCamera";
import PlanetOrbitCamera from "./PlanetOrbitCamera";
import VesselFlight from "./VesselFlight";
import type { SpaceBgCamera, SpaceBgView } from "@/lib/spaceBackgroundSettings";
import DescentScene from "../world/DescentScene";
import type { QualityTier } from "../world/qualityTiers";

interface Props {
  /** false = reduced particle counts / no post-processing (mobile, low power) */
  full: boolean;
  /** false = frozen frame (prefers-reduced-motion or hidden tab) */
  animate: boolean;
  /** solar system (default), the alien mining world, or the Earth descent */
  view?: SpaceBgView;
  /** which vantage point the camera uses in the solar view */
  cameraMode?: SpaceBgCamera;
  /** resolved detail tier for the world scenes */
  tier: QualityTier;
}

const CHROMA = new THREE.Vector2(0.00008, 0.0001);

const SceneContents = ({ full, animate, dpr, view = "solar", cameraMode = "galaxy", tier }: Props & { dpr: number }) => {
  // ambient lift reacts gently to live market volatility
  const [boost, setBoost] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setBoost(1 + marketPulse.volatility * 0.35), 1500);
    return () => clearInterval(id);
  }, []);

  const mining = view === "mining";
  const descent = view === "descent";

  return (
    <>
      {descent ? null : mining || cameraMode === "chase" ? (
        <ShipChaseCamera animate={animate} />
      ) : cameraMode === "orbit" ? (
        <PlanetOrbitCamera animate={animate} />
      ) : (
        <CameraRig animate={animate} />
      )}

      {descent ? (
        <DescentScene full={full} animate={animate} tier={tier} dpr={dpr} />
      ) : mining ? (
        <MiningWorld animate={animate} full={full} />
      ) : (
        <>
          <Galaxy full={full} boost={boost} />
          <Starfield full={full} dpr={dpr} boost={boost} />
          <StarTrails count={full ? 420 : 120} animate={animate} />
          <Planets full={full} />
          <MarketComets animate={animate} />
          <VesselFlight animate={animate} full={full} />
        </>
      )}


      {full && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.62} luminanceThreshold={0.48} luminanceSmoothing={0.32} mipmapBlur />
          <ChromaticAberration offset={CHROMA} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
          <Noise premultiply opacity={0.025} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.28} darkness={0.82} />
        </EffectComposer>
      )}
    </>
  );
};

const SpaceScene = ({ full, animate, view = "solar", cameraMode = "galaxy", tier }: Props) => {
  useMarketPulse();
  const dpr = full ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;

  return (
    <Canvas
      className="absolute inset-0"
      gl={{ antialias: false, alpha: false, powerPreference: full ? "high-performance" : "low-power" }}
      dpr={dpr}
      frameloop={animate ? "always" : "demand"}
      camera={{ fov: 60, near: 0.5, far: 9000, position: [210, 40, 0] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 1);
        scene.background = new THREE.Color(0x000000);
      }}
    >
      <SceneContents full={full} animate={animate} dpr={dpr} view={view} cameraMode={cameraMode} tier={tier} />
    </Canvas>
  );
};

export default SpaceScene;
