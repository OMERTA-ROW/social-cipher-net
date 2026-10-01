import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Settings2, ChevronDown, ChevronUp, Save, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { PaletteName, IntensityName } from "@/lib/spacePalettes";
import DeepSky from "@/components/space/scene/DeepSky";
import Starfield from "@/components/space/scene/Starfield";
import SharedSun, { PHOTO_RADIUS as SUN_PHOTO_RADIUS } from "@/components/space/scene/Sun";
import MiningVessel from "@/components/space/scene/MiningVessel";
import VoyageCelestialBody, { type VoyagePlanetDef } from "@/components/space/voyage/VoyageCelestialBody";
import VoyageAsteroidField from "@/components/space/voyage/VoyageAsteroidField";
import CosmicAnomalies, { SolarFlares } from "@/components/space/CosmicAnomalies";
import { prefersReducedMotion } from "@/lib/spaceBackgroundSettings";

interface VoyagePreset {
  name: string;
  palette: PaletteName;
  quality: Quality;
  autoIntensity: boolean;
}
const PRESETS_KEY = "voyage.presets.v1";

type ViewMode = "cockpit" | "chase" | "orbital" | "cinematic" | "closeup" | "harvest";
type Quality = "low" | "medium" | "high" | "auto";

interface QualityPreset {
  starDensity: number;
  intensity: IntensityName;
  parallax: boolean;
  interactive: boolean;
  bgStars: number;      // drei <Stars> count
  asteroids: number;    // asteroid rock count
  dpr: [number, number]; // Canvas devicePixelRatio range
}

const QUALITY_PRESETS: Record<Exclude<Quality, "auto">, QualityPreset> = {
  low:    { starDensity: 0.5, intensity: "calm",   parallax: false, interactive: false, bgStars: 800,  asteroids: 30, dpr: [0.6, 1] },
  medium: { starDensity: 1.0, intensity: "normal", parallax: true,  interactive: true,  bgStars: 1800, asteroids: 60, dpr: [1, 1.5] },
  high:   { starDensity: 1.6, intensity: "vivid",  parallax: true,  interactive: true,  bgStars: 3500, asteroids: 100, dpr: [1, 2] },
};

const PLANETS: VoyagePlanetDef[] = [
  { name: "Mercury", radius: 0.35, distance: 6, speed: 0.9, tilt: 0.03, atmosphere: [0.55, 0.51, 0.47], atmosphereStrength: 0.1, roughness: 1, bump: 0.08 },
  { name: "Venus", radius: 0.55, distance: 8, speed: 0.75, tilt: 0.05, atmosphere: [0.95, 0.68, 0.3], atmosphereStrength: 0.55, roughness: 0.9, bump: 0.035 },
  { name: "Earth", radius: 0.6, distance: 11, speed: 0.6, tilt: 0.41, atmosphere: [0.3, 0.55, 1], atmosphereStrength: 0.9, roughness: 0.72, bump: 0.05 },
  { name: "Mars", radius: 0.45, distance: 14, speed: 0.5, tilt: 0.44, atmosphere: [0.75, 0.4, 0.28], atmosphereStrength: 0.28, roughness: 0.94, bump: 0.07 },
  { name: "Jupiter", radius: 1.4, distance: 19, speed: 0.35, tilt: 0.05, atmosphere: [0.8, 0.66, 0.45], atmosphereStrength: 0.42, roughness: 0.62, bump: 0.012 },
  { name: "Saturn", radius: 1.15, distance: 24, speed: 0.28, tilt: 0.47, atmosphere: [0.85, 0.78, 0.55], atmosphereStrength: 0.38, roughness: 0.62, bump: 0.01 },
  { name: "Uranus", radius: 0.85, distance: 29, speed: 0.22, tilt: 1.6, atmosphere: [0.45, 0.8, 0.95], atmosphereStrength: 0.5, roughness: 0.56, bump: 0.008 },
  { name: "Neptune", radius: 0.85, distance: 33, speed: 0.18, tilt: 0.49, atmosphere: [0.25, 0.42, 1], atmosphereStrength: 0.58, roughness: 0.55, bump: 0.008 },
];

const ASTEROID_BELT_R = 38;

// ---------- Scene pieces ----------
const VoyageSun = ({ full, animate }: { full: boolean; animate: boolean }) => {
  return (
    <group>
      <group scale={0.1375}>
        <SharedSun full={full} animate={animate} />
        <SolarFlares radius={SUN_PHOTO_RADIUS} animate={animate} full={full} />
      </group>
      <pointLight color="#fff4dc" intensity={6200} distance={0} decay={2} />
    </group>
  );
};

// Keeps OrbitControls target locked to the focused planet's world position each frame.
const FocusFollower = ({
  controlsRef,
  planetRefs,
  focusedPlanet,
  focusedRadius,
  targetOrbitSpeed,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  planetRefs: React.MutableRefObject<Record<string, THREE.Mesh | null>>;
  focusedPlanet: string | null;
  focusedRadius: number | undefined;
  targetOrbitSpeed: number;
}) => {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const currentSpeed = useRef(0);
  const previousFocus = useRef<string | null>(null);
  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const focusedMesh = focusedPlanet ? planetRefs.current[focusedPlanet] : null;
    if (focusedMesh) {
      focusedMesh.getWorldPosition(tmp);
      if (previousFocus.current !== focusedPlanet) {
        const radius = focusedRadius ?? 1;
        const distance = Math.max(radius * 4.2, 2.4);
        const sunward = tmp.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-sunward.z, 0, sunward.x).normalize();
        const viewDirection = sunward.multiplyScalar(0.82)
          .add(tangent.multiplyScalar(0.42))
          .add(new THREE.Vector3(0, 0.24, 0))
          .normalize();
        controls.object.position.copy(tmp).add(viewDirection.multiplyScalar(distance));
      }
      controls.target.lerp(tmp, 0.2);
    } else {
      controls.target.lerp(tmp.set(0, 0, 0), 0.1);
    }
    // Smoothly ramp orbit speed toward target (exponential smoothing, ~0.6s time constant)
    const goal = focusedPlanet ? targetOrbitSpeed : 0;
    const k = 1 - Math.exp(-dt / 0.6);
    currentSpeed.current += (goal - currentSpeed.current) * k;
    const applied = currentSpeed.current * 2;
    controls.autoRotate = Math.abs(applied) > 0.01;
    controls.autoRotateSpeed = applied;
    controls.update();
    previousFocus.current = focusedPlanet;
  });
  return null;
};

const HarvesterBot = ({ offset, color, personaLabel, animate }: { offset: number; color: string; personaLabel: string; animate: boolean }) => {
  const ref = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.getElapsedTime() * 0.4 + offset;
    const r = ASTEROID_BELT_R + Math.sin(t * 1.3) * 1.2;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * r, Math.sin(t * 2) * 0.4, Math.sin(t) * r);
      ref.current.rotation.y = -t + Math.PI / 2;
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 6) * 0.3;
    }
  });
  return (
    <group ref={ref}>
      {/* Compact industrial mining drone */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.24, 0.72]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.08, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.34, 8]} />
        <meshStandardMaterial color="#536779" metalness={0.9} roughness={0.24} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.36, 0, 0]}>
          <mesh rotation={[0, 0, side * 0.45]}>
            <boxGeometry args={[0.32, 0.07, 0.1]} />
            <meshStandardMaterial color="#536779" metalness={0.85} roughness={0.32} />
          </mesh>
          <mesh position={[side * 0.18, -0.1, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Mining beam */}
      <mesh ref={beamRef} position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.02, 0.14, 1.2, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html center position={[0, 0.5, 0]} distanceFactor={16}>
        <div className="px-1.5 py-0.5 rounded bg-background/60 text-[10px] text-foreground whitespace-nowrap">
          {personaLabel}
        </div>
      </Html>
    </group>
  );
};

// Ship following a Catmull-Rom curve through planets
const Ship = ({ tRef, speedRef, shipRef }: {
  tRef: React.MutableRefObject<number>;
  speedRef: React.MutableRefObject<number>;
  shipRef: React.MutableRefObject<THREE.Group | null>;
}) => {
  const curve = useMemo(() => {
    const pts = PLANETS.map((p, i) => {
      const a = (i / PLANETS.length) * Math.PI * 1.5;
      return new THREE.Vector3(Math.cos(a) * p.distance, 0, Math.sin(a) * p.distance);
    });
    pts.push(new THREE.Vector3(ASTEROID_BELT_R, 0, 0));
    return new THREE.CatmullRomCurve3(pts, true, "centripetal");
  }, []);

  useFrame((_, dt) => {
    tRef.current = (tRef.current + dt * 0.03 * speedRef.current) % 1;
    const pos = curve.getPoint(tRef.current);
    const tan = curve.getTangent(tRef.current);
    if (shipRef.current) {
      shipRef.current.position.copy(pos);
      shipRef.current.lookAt(pos.clone().add(tan));
    }
  });

  return (
    <group ref={shipRef}>
      <MiningVessel animate={speedRef.current > 0} throttle={Math.min(1, speedRef.current / 4)} beam={0} crew scale={0.22} />
    </group>
  );
};

// Camera controller — attaches to a mode
const CameraRig = ({
  mode,
  shipRef,
  cinematicIdx,
}: {
  mode: ViewMode;
  shipRef: React.MutableRefObject<THREE.Group | null>;
  cinematicIdx: number;
}) => {
  useFrame(({ camera }) => {
    if (!shipRef.current) return;
    const shipPos = shipRef.current.position;
    const shipDir = new THREE.Vector3(0, 0, 1).applyQuaternion(shipRef.current.quaternion);

    if (mode === "cockpit") {
      camera.position.copy(shipPos).add(shipDir.clone().multiplyScalar(0.4));
      camera.lookAt(shipPos.clone().add(shipDir.clone().multiplyScalar(6)));
    } else if (mode === "chase") {
      const target = shipPos.clone().add(shipDir.clone().multiplyScalar(-3)).add(new THREE.Vector3(0, 1.2, 0));
      camera.position.lerp(target, 0.1);
      camera.lookAt(shipPos);
    } else if (mode === "cinematic") {
      const p = PLANETS[cinematicIdx % PLANETS.length];
      const target = new THREE.Vector3(p.distance * 0.9, 3, p.distance * 0.4);
      camera.position.lerp(target, 0.03);
      camera.lookAt(0, 0, 0);
    } else if (mode === "harvest") {
      const target = new THREE.Vector3(ASTEROID_BELT_R + 4, 3, 4);
      camera.position.lerp(target, 0.05);
      camera.lookAt(ASTEROID_BELT_R, 0, 0);
    } else if (mode === "closeup") {
      // handled outside via OrbitControls target reset
    }
    // orbital handled by OrbitControls
  });
  return null;
};

// ---------- Page ----------
const VIEW_MODES: { key: ViewMode; label: string; hint: string }[] = [
  { key: "cockpit",   label: "Cockpit",     hint: "First-person from ship" },
  { key: "chase",     label: "Chase",       hint: "Follow cam" },
  { key: "orbital",   label: "Orbital",     hint: "Free orbit — drag to look" },
  { key: "cinematic", label: "Cinematic",   hint: "Auto-cutting planet cams" },
  { key: "closeup",   label: "Close-up",    hint: "Click any planet" },
  { key: "harvest",   label: "Harvest",     hint: "Watch AI bots mine" },
];

const SolarSystemVoyage = () => {
  const [mode, setMode] = useState<ViewMode>("chase");
  const [speed, setSpeed] = useState(1);
  const [travelling, setTravelling] = useState(true);
  const [focusedPlanet, setFocusedPlanet] = useState<string | null>(null);
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const [cinematicIdx, setCinematicIdx] = useState(0);

  // Background engagement controls
  const [palette, setPalette] = useState<PaletteName>("solar");
  const [autoIntensity, setAutoIntensity] = useState(true);
  const [showControls, setShowControls] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 900px)").matches,
  );

  // Named presets (persisted)
  const [presets, setPresets] = useState<VoyagePreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch { return []; }
  });
  const [presetName, setPresetName] = useState("");
  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);
  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      next.push({ name, palette, quality, autoIntensity });
      return next;
    });
    setPresetName("");
  };
  const loadPreset = (p: VoyagePreset) => {
    setPalette(p.palette);
    setQuality(p.quality);
    setAutoIntensity(p.autoIntensity);
  };
  const deletePreset = (name: string) => setPresets((prev) => prev.filter((p) => p.name !== name));


  // Quality tier — overrides individual controls when not "auto"
  const [quality, setQuality] = useState<Quality>("auto");
  const [autoTier, setAutoTier] = useState<Exclude<Quality, "auto">>("high");
  const [fps, setFps] = useState(60);

  // Real-time FPS sampler
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 500) {
        const measured = (frames * 1000) / (now - last);
        setFps(Math.round(measured));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto quality: downgrade/upgrade with hysteresis based on FPS
  useEffect(() => {
    if (quality !== "auto") return;
    setAutoTier((cur) => {
      if (fps < 32 && cur !== "low") return cur === "high" ? "medium" : "low";
      if (fps < 48 && cur === "high") return "medium";
      if (fps > 56 && cur === "low") return "medium";
      if (fps > 58 && cur === "medium") return "high";
      return cur;
    });
  }, [fps, quality]);

  const activeTier: Exclude<Quality, "auto"> = quality === "auto" ? autoTier : quality;
  const preset = QUALITY_PRESETS[activeTier];

  // Quality-overridden effective values (fall back to user controls if we ever add a "custom" tier)
  const effStarDensity = preset.starDensity;
  const effParallax = preset.parallax;
  const effInteractive = preset.interactive;
  const effectiveIntensity: IntensityName =
    autoIntensity ? (speed > 3 ? "hyper" : preset.intensity) : preset.intensity;

  const reducedMotion = useMemo(prefersReducedMotion, []);
  const sceneAnimated = travelling && !reducedMotion;
  const paletteVeil = {
    cosmic: "bg-primary/5",
    draco: "bg-destructive/5",
    brain: "bg-accent/5",
    solar: "bg-secondary/5",
  }[palette];


  const tRef = useRef(0);
  const speedRef = useRef(1);
  const shipRef = useRef<THREE.Group | null>(null);

  useEffect(() => { speedRef.current = travelling ? speed : 0; }, [speed, travelling]);

  // Cinematic auto-cut
  useEffect(() => {
    if (mode !== "cinematic") return;
    const id = setInterval(() => setCinematicIdx((i) => i + 1), 4500);
    return () => clearInterval(id);
  }, [mode]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, ViewMode> = { "1": "cockpit", "2": "chase", "3": "orbital", "4": "cinematic", "5": "closeup", "6": "harvest" };
      if (map[e.key]) setMode(map[e.key]);
      if (e.code === "Space") { e.preventDefault(); setTravelling((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusedDef = PLANETS.find((p) => p.name === focusedPlanet);
  const planetRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const selectFocus = (name: string | null) => {
    setFocusedPlanet(name);
    if (name) setMode((m) => (m === "orbital" || m === "closeup" ? m : "closeup"));
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className={`pointer-events-none absolute inset-0 ${paletteVeil}`} />

      <Canvas
        camera={{ position: [0, 20, 45], fov: 55, near: 0.05, far: 5000000 }}
        dpr={preset.dpr}
        className="!absolute inset-0"
        gl={{ antialias: false, alpha: false, logarithmicDepthBuffer: true, powerPreference: activeTier === "low" ? "low-power" : "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 1);
          scene.background = new THREE.Color(0x000000);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.075} />
          <DeepSky full={activeTier === "high"} />
          <Starfield full={activeTier !== "low"} dpr={preset.dpr[1]} boost={autoIntensity && speed > 3 ? 1.35 : 1} />
          <VoyageSun full={activeTier === "high"} animate={sceneAnimated} />
          {PLANETS.map((p) => (
            <VoyageCelestialBody
              key={p.name}
              definition={p}
              full={activeTier === "high"}
              animate={sceneAnimated}
              focused={focusedPlanet === p.name}
              registerRef={(m) => { planetRefs.current[p.name] = m; }}
              onSelect={() => { selectFocus(p.name); }}
            />
          ))}
          <VoyageAsteroidField count={preset.asteroids} animate={sceneAnimated} />
          <CosmicAnomalies scale={10} animate={sceneAnimated} full={activeTier !== "low"} />

          {/* Harvester fleet */}
          <HarvesterBot offset={0} color="#8fb4c9" personaLabel="Zozo-01" animate={sceneAnimated} />
          <HarvesterBot offset={2.1} color="#8fb4c9" personaLabel="Zozo-02" animate={sceneAnimated} />
          <HarvesterBot offset={4.2} color="#ff5533" personaLabel="Draco-01" animate={sceneAnimated} />
          <HarvesterBot offset={5.7} color="#ff5533" personaLabel="Draco-02" animate={sceneAnimated} />
          <HarvesterBot offset={1.1} color="#ffb347" personaLabel="Hauler" animate={sceneAnimated} />

          <Ship tRef={tRef} speedRef={speedRef} shipRef={shipRef} />

          <CameraRig mode={mode} shipRef={shipRef} cinematicIdx={cinematicIdx} />

          {(mode === "orbital" || mode === "closeup") && (
            <>
              <OrbitControls
                ref={controlsRef}
                enablePan={mode === "orbital" && !focusedPlanet}
                minDistance={focusedDef ? Math.max(focusedDef.radius * 2.5, 1.5) : 2}
                maxDistance={120000}
              />
              <FocusFollower controlsRef={controlsRef} planetRefs={planetRefs} focusedPlanet={focusedPlanet} focusedRadius={focusedDef?.radius} targetOrbitSpeed={orbitSpeed} />
            </>
          )}
          {activeTier === "high" && !reducedMotion && (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.42} luminanceThreshold={0.58} luminanceSmoothing={0.32} mipmapBlur />
              <Noise premultiply opacity={0.018} blendFunction={BlendFunction.OVERLAY} />
              <Vignette eskil={false} offset={0.25} darkness={0.72} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* Top-right view switcher */}
      <div className="absolute right-2 top-2 z-10 flex max-h-[calc(100dvh-7rem)] w-[min(15rem,calc(100vw-4.5rem))] flex-col gap-2 overflow-y-auto pointer-events-auto sm:right-4 sm:top-4 sm:max-h-[calc(100dvh-2rem)] sm:w-60">
        <div className="rounded-md bg-background/75 backdrop-blur-xl border border-primary/25 p-2 shadow-[0_0_24px_hsl(var(--primary)/0.1)]">
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1">View Mode</div>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-2">
          {VIEW_MODES.map((v, i) => (
            <Button
              key={v.key}
              size="sm"
              variant={mode === v.key ? "default" : "ghost"}
              className="justify-start h-8 text-[11px]"
              onClick={() => setMode(v.key)}
              title={v.hint}
            >
              <span className="mr-2 opacity-60">{i + 1}</span>
              {v.label}
            </Button>
          ))}
          </div>
        </div>

        {/* Planet focus selector */}
        <div className="rounded-md bg-background/75 backdrop-blur-xl border border-primary/25 p-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1">Focus Planet</div>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant={!focusedPlanet ? "default" : "outline"}
              className="h-7 text-[11px] col-span-2"
              onClick={() => { setFocusedPlanet(null); }}
              title="Recenter on the Sun"
            >
              Sun / Center
            </Button>
            {PLANETS.map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant={focusedPlanet === p.name ? "default" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => selectFocus(p.name)}
                title={`Orbit ${p.name}`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.75)]"
                />
                {p.name}
              </Button>
            ))}
          </div>
          {focusedPlanet && (
            <>
              <div className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-tight">
                Camera tracks {focusedPlanet}. Drag to orbit, scroll to zoom.
              </div>
              <div className="mt-2 px-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Orbit Speed</span>
                  <span className="font-mono">{orbitSpeed.toFixed(2)}×</span>
                </div>
                <Slider
                  value={[orbitSpeed]}
                  min={-4}
                  max={4}
                  step={0.1}
                  onValueChange={([v]) => setOrbitSpeed(v)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 w-full h-6 text-[10px]"
                  onClick={() => setOrbitSpeed(0)}
                >
                  Stop rotation
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Background engagement controls */}
        <div className="rounded-md bg-background/75 backdrop-blur-xl border border-primary/25 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1"
            onClick={() => setShowControls((s) => !s)}
          >
            <span className="flex items-center gap-1.5"><Settings2 className="h-3 w-3" /> Background</span>
            {showControls ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {showControls && (
            <div className="space-y-3 p-1">
              {/* Quality tier */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase text-muted-foreground">Quality</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {fps} fps{quality === "auto" ? ` · ${activeTier}` : ""}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(["low", "medium", "high", "auto"] as Quality[]).map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant={quality === q ? "default" : "outline"}
                      className="h-7 text-[10px] capitalize px-1"
                      onClick={() => setQuality(q)}
                      title={
                        q === "auto"
                          ? "Adapts to measured FPS"
                          : `${QUALITY_PRESETS[q].bgStars} stars · ${QUALITY_PRESETS[q].asteroids} rocks · ${QUALITY_PRESETS[q].intensity}`
                      }
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Palette */}
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Palette</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(["cosmic", "draco", "brain", "solar"] as PaletteName[]).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={palette === p ? "default" : "outline"}
                      className="h-7 text-[11px] capitalize"
                      onClick={() => setPalette(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-intensity" className="text-[11px]">Auto-hyper at warp</Label>
                <Switch id="auto-intensity" checked={autoIntensity} onCheckedChange={setAutoIntensity} />
              </div>

              {/* Presets */}
              <div className="pt-2 border-t border-border/40">
                <Label className="text-[10px] uppercase text-muted-foreground">Presets</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePreset()}
                    placeholder="Preset name"
                    className="h-7 text-[11px] px-2"
                  />
                  <Button size="sm" className="h-7 px-2" onClick={savePreset} disabled={!presetName.trim()} title="Save current settings">
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
                {presets.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] flex-1 justify-start truncate"
                          onClick={() => loadPreset(p)}
                          title={`${p.palette} · ${p.quality}${p.autoIntensity ? " · auto-hyper" : ""}`}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto opacity-60 text-[9px]">{p.palette}/{p.quality}</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deletePreset(p.name)} title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground leading-tight pt-1 border-t border-border/40">
                Tier tunes stars, particles, parallax & DPR to keep FPS smooth.
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Bottom warp + HUD */}
      <div className="absolute bottom-2 left-2 z-10 flex max-w-[calc(100vw-1rem)] flex-wrap items-end gap-2 pointer-events-auto sm:bottom-4 sm:left-4 sm:gap-3">
        <div className="w-[min(17rem,calc(100vw-1rem))] rounded-md bg-background/75 backdrop-blur-xl border border-primary/25 p-3">
          <div className="text-xs text-muted-foreground mb-2">Warp Speed: {speed.toFixed(2)}×</div>
          <Slider
            value={[speed]}
            min={0.25}
            max={8}
            step={0.25}
            onValueChange={([v]) => setSpeed(v)}
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full h-7 text-xs"
            onClick={() => setTravelling((v) => !v)}
          >
            {travelling ? "Pause Travel" : "Resume Travel"}  (Space)
          </Button>
        </div>

        <div className="hidden rounded-md bg-background/75 backdrop-blur-xl border border-primary/25 p-3 text-xs space-y-1 min-[900px]:block">
          <div className="uppercase tracking-wider text-muted-foreground">Harvest Ops</div>
          <div>Fleet: <Badge variant="secondary">2× Zozo</Badge> <Badge variant="destructive">2× Draco</Badge> <Badge>1× Hauler</Badge></div>
          <div>Resources: <span className="text-muted-foreground">Telemetry unavailable</span></div>
          <div>Target: Asteroid Belt (R {ASTEROID_BELT_R})</div>
        </div>

        {focusedDef && mode === "closeup" && (
          <div className="rounded-md bg-background/75 backdrop-blur-xl border border-primary p-3 text-xs">
            <div className="uppercase tracking-wider text-primary">{focusedDef.name}</div>
            <div>Orbit radius: {focusedDef.distance}</div>
            <div>Radius: {focusedDef.radius}</div>
            <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" onClick={() => { setFocusedPlanet(null); setMode("chase"); }}>
              Exit close-up
            </Button>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="absolute left-2 top-2 z-10 sm:left-4 sm:top-4 sm:max-w-[calc(100vw-17rem)]">
        <Button variant="ghost" size="sm" asChild className="mb-2 bg-background/60 backdrop-blur-xl">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
        </Button>
        <div className="hidden sm:block">
          <h1 className="hologram-title text-xl font-bold sm:text-2xl">Solar System Voyage</h1>
          <p className="text-xs text-muted-foreground">Keys 1–6 switch views · Space pauses travel</p>
        </div>
      </div>
    </div>
  );
};

export default SolarSystemVoyage;
