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

interface Props {
  /** false = reduced particle counts / no post-processing (mobile, low power) */
  full: boolean;
  /** false = frozen frame (prefers-reduced-motion or hidden tab) */
  animate: boolean;
}

const CHROMA = new THREE.Vector2(0.0006, 0.0009);

const SceneContents = ({ full, animate, dpr }: Props & { dpr: number }) => {
  // ambient lift reacts gently to live market volatility
  const [boost, setBoost] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setBoost(1 + marketPulse.volatility * 0.35), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <CameraRig animate={animate} />
      <Galaxy full={full} boost={boost} />
      <Starfield full={full} dpr={dpr} boost={boost} />
      <StarTrails count={full ? 420 : 120} animate={animate} />
      <Planets full={full} />
      <MarketComets animate={animate} />

      {full && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.22} luminanceSmoothing={0.5} mipmapBlur />
          <ChromaticAberration offset={CHROMA} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
          <Noise premultiply opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      )}
    </>
  );
};

const SpaceScene = ({ full, animate }: Props) => {
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
      <SceneContents full={full} animate={animate} dpr={dpr} />
    </Canvas>
  );
};

export default SpaceScene;
