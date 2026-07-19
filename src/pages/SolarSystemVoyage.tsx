import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";
import type { PaletteName, IntensityName } from "@/lib/spacePalettes";

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

interface PlanetDef {
  name: string;
  radius: number;
  distance: number;
  color: string;
  speed: number;
  emissive?: string;
}

const PLANETS: PlanetDef[] = [
  { name: "Mercury", radius: 0.35, distance: 6,  color: "#a9a29b", speed: 0.9 },
  { name: "Venus",   radius: 0.55, distance: 8,  color: "#e8c07d", speed: 0.75 },
  { name: "Earth",   radius: 0.6,  distance: 11, color: "#3a7bd5", speed: 0.6, emissive: "#0a2540" },
  { name: "Mars",    radius: 0.45, distance: 14, color: "#c1440e", speed: 0.5 },
  { name: "Jupiter", radius: 1.4,  distance: 19, color: "#d1a066", speed: 0.35 },
  { name: "Saturn",  radius: 1.15, distance: 24, color: "#e6d3a3", speed: 0.28 },
  { name: "Uranus",  radius: 0.85, distance: 29, color: "#7fd4e0", speed: 0.22 },
  { name: "Neptune", radius: 0.85, distance: 33, color: "#3d5afe", speed: 0.18 },
];

const ASTEROID_BELT_R = 38;

// ---------- Scene pieces ----------
const Sun = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.1;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.2, 48, 48]} />
      <meshBasicMaterial color="#ffb347" />
      <pointLight color="#fff2c2" intensity={3.5} distance={80} decay={1.2} />
    </mesh>
  );
};

const OrbitRing = ({ r }: { r: number }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seg = 128;
    const pts: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [r]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.12} />
    </line>
  );
};

const Planet = ({ def, onClick, focused }: { def: PlanetDef; onClick: () => void; focused: boolean }) => {
  const ref = useRef<THREE.Mesh>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  useFrame((_, dt) => {
    angleRef.current += dt * def.speed * 0.15;
    if (ref.current) {
      ref.current.position.x = Math.cos(angleRef.current) * def.distance;
      ref.current.position.z = Math.sin(angleRef.current) * def.distance;
      ref.current.rotation.y += dt * 0.3;
    }
  });
  return (
    <mesh ref={ref} onClick={onClick}>
      <sphereGeometry args={[def.radius, 32, 32]} />
      <meshStandardMaterial
        color={def.color}
        emissive={def.emissive || "#000"}
        emissiveIntensity={focused ? 0.4 : 0.1}
        roughness={0.75}
        metalness={0.1}
      />
      {def.name === "Saturn" && (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[def.radius * 1.4, def.radius * 2.1, 64]} />
          <meshBasicMaterial color="#e6d3a3" side={THREE.DoubleSide} transparent opacity={0.55} />
        </mesh>
      )}
      {focused && (
        <Html center distanceFactor={12}>
          <div className="px-2 py-0.5 rounded bg-background/70 border border-primary text-xs text-primary whitespace-nowrap">
            {def.name}
          </div>
        </Html>
      )}
    </mesh>
  );
};

const AsteroidField = ({ count = 80 }: { count?: number }) => {
  const rocks = useMemo(() => {
    return Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = ASTEROID_BELT_R + (Math.random() - 0.5) * 3;
      return {
        pos: [Math.cos(a) * r, (Math.random() - 0.5) * 0.6, Math.sin(a) * r] as [number, number, number],
        s: Math.random() * 0.25 + 0.1,
        rot: [Math.random(), Math.random(), Math.random()] as [number, number, number],
      };
    });
  }, [count]);
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.02;
  });
  return (
    <group ref={groupRef}>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={r.rot}>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color="#6b6255" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

const HarvesterBot = ({ offset, color, personaLabel }: { offset: number; color: string; personaLabel: string }) => {
  const ref = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
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
      {/* Saucer body */}
      <mesh>
        <sphereGeometry args={[0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.06, 20]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
      </mesh>
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
      <mesh>
        <coneGeometry args={[0.25, 0.9, 12]} />
        <meshStandardMaterial color="#c5e3ff" metalness={0.8} roughness={0.2} emissive="#3aa0ff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.5]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshBasicMaterial color="#7fd4ff" />
      </mesh>
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
  const [cinematicIdx, setCinematicIdx] = useState(0);
  const [resources, setResources] = useState(0);

  // Background engagement controls
  const [palette, setPalette] = useState<PaletteName>("solar");
  const [intensity, setIntensity] = useState<IntensityName>("vivid");
  const [starDensity, setStarDensity] = useState(1.4);
  const [parallax, setParallax] = useState(true);
  const [interactive, setInteractive] = useState(true);
  const [autoIntensity, setAutoIntensity] = useState(true);
  const [showControls, setShowControls] = useState(true);

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

  // Resource ticker (visual)
  useEffect(() => {
    const id = setInterval(() => setResources((r) => r + Math.floor(Math.random() * 4 + 2)), 800);
    return () => clearInterval(id);
  }, []);

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

  return (
    <div className="fixed inset-0 overflow-hidden">
      <RealisticSpaceBackground
        palette={palette}
        intensity={effectiveIntensity}
        starDensity={effStarDensity}
        parallax={effParallax}
        interactive={effInteractive}
      />

      <Canvas
        camera={{ position: [0, 20, 45], fov: 55, near: 0.05, far: 500 }}
        dpr={preset.dpr}
        className="!absolute inset-0"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.25} />
          <Stars key={activeTier} radius={200} depth={60} count={preset.bgStars} factor={4} fade speed={activeTier === "low" ? 0.2 : 0.5} />
          <Sun />
          {PLANETS.map((p) => <OrbitRing key={p.name} r={p.distance} />)}
          <OrbitRing r={ASTEROID_BELT_R} />
          {PLANETS.map((p) => (
            <Planet
              key={p.name}
              def={p}
              focused={focusedPlanet === p.name}
              onClick={() => { setFocusedPlanet(p.name); setMode("closeup"); }}
            />
          ))}
          <AsteroidField count={preset.asteroids} />

          {/* Harvester fleet */}
          <HarvesterBot offset={0}     color="#8fb4c9" personaLabel="Zozo-01" />
          <HarvesterBot offset={2.1}   color="#8fb4c9" personaLabel="Zozo-02" />
          <HarvesterBot offset={4.2}   color="#ff5533" personaLabel="Draco-01" />
          <HarvesterBot offset={5.7}   color="#ff5533" personaLabel="Draco-02" />
          <HarvesterBot offset={1.1}   color="#ffb347" personaLabel="Hauler" />

          <Ship tRef={tRef} speedRef={speedRef} shipRef={shipRef} />

          <CameraRig mode={mode} shipRef={shipRef} cinematicIdx={cinematicIdx} />

          {(mode === "orbital" || mode === "closeup") && (
            <OrbitControls
              enablePan={mode === "orbital"}
              target={focusedDef ? [focusedDef.distance, 0, 0] : [0, 0, 0]}
              minDistance={2}
              maxDistance={120}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Top-right view switcher */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-auto">
        <div className="rounded-lg bg-background/70 backdrop-blur border border-border p-2 flex flex-col gap-1 min-w-[180px]">
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1">View Mode</div>
          {VIEW_MODES.map((v, i) => (
            <Button
              key={v.key}
              size="sm"
              variant={mode === v.key ? "default" : "ghost"}
              className="justify-start h-8 text-xs"
              onClick={() => setMode(v.key)}
              title={v.hint}
            >
              <span className="mr-2 opacity-60">{i + 1}</span>
              {v.label}
            </Button>
          ))}
        </div>

        {/* Background engagement controls */}
        <div className="rounded-lg bg-background/70 backdrop-blur border border-border p-2 min-w-[220px]">
          <button
            className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1 hover:text-foreground"
            onClick={() => setShowControls((s) => !s)}
          >
            <span className="flex items-center gap-1.5"><Settings2 className="h-3 w-3" /> Background</span>
            {showControls ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showControls && (
            <div className="space-y-3 p-1">
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
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase text-muted-foreground">Intensity</Label>
                  <div className="flex items-center gap-1">
                    <Switch id="auto-intensity" checked={autoIntensity} onCheckedChange={setAutoIntensity} className="scale-75" />
                    <Label htmlFor="auto-intensity" className="text-[10px]">Auto</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(["calm", "normal", "vivid", "hyper"] as IntensityName[]).map((i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={intensity === i ? "default" : "outline"}
                      disabled={autoIntensity && speed > 3 && i !== "hyper"}
                      className="h-7 text-[11px] capitalize"
                      onClick={() => setIntensity(i)}
                    >
                      {i}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Star Density: {starDensity.toFixed(1)}×</Label>
                <Slider
                  value={[starDensity]}
                  min={0.1}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => setStarDensity(v)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="parallax" className="text-[11px]">Parallax</Label>
                <Switch id="parallax" checked={parallax} onCheckedChange={setParallax} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="interactive" className="text-[11px]">Interactive</Label>
                <Switch id="interactive" checked={interactive} onCheckedChange={setInteractive} />
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Bottom warp + HUD */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3 items-end z-10 pointer-events-auto">
        <div className="rounded-lg bg-background/70 backdrop-blur border border-border p-3 min-w-[260px]">
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

        <div className="rounded-lg bg-background/70 backdrop-blur border border-border p-3 text-xs space-y-1">
          <div className="uppercase tracking-wider text-muted-foreground">Harvest Ops</div>
          <div>Fleet: <Badge variant="secondary">2× Zozo</Badge> <Badge variant="destructive">2× Draco</Badge> <Badge>1× Hauler</Badge></div>
          <div>Resources: <span className="text-primary font-mono">{resources.toLocaleString()}</span> ◈</div>
          <div>Target: Asteroid Belt (R {ASTEROID_BELT_R})</div>
        </div>

        {focusedDef && mode === "closeup" && (
          <div className="rounded-lg bg-background/70 backdrop-blur border border-primary p-3 text-xs">
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
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-primary drop-shadow">Solar System Voyage</h1>
        <p className="text-xs text-muted-foreground">Keys 1–6 switch views · Space pauses travel</p>
      </div>
    </div>
  );
};

export default SolarSystemVoyage;
