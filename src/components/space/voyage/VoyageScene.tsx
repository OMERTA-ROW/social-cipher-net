import { Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import DeepSky from "@/components/space/scene/DeepSky";
import Starfield from "@/components/space/scene/Starfield";
import MiningVessel from "@/components/space/scene/MiningVessel";
import Sun, { PHOTO_RADIUS } from "@/components/space/scene/Sun";
import { SolarFlares } from "@/components/space/CosmicAnomalies";
import DarkMatterField from "./DarkMatterField";
import { CLOUD_TEXTURE_URLS, RING_TEXTURE_URL, SPACE_TEXTURE_URLS, SUN_TEXTURE_URL, useLazyTexture } from "@/components/space/realTextures";
import {
  CELESTIAL_BODIES, SUN, SUN_VISUAL_RADIUS, bodyPositionAt, bodyRenderPosition, gravityFromFrame, computeFrame, localVisualDistance, nearbyObjects, physicalObstaclesAt,
  predictTrajectory, referenceBody, renderPosition, ringQuaternion, runFixedSteps, spinAngleAt, stepWorld, thrustFrame, visualRadius, bodyVelocityAt,
  type CelestialBodyData, type NearbyObject, type ShipStatus, type StepEvent, type WorldState,
  type EngineMode,
} from "@/lib/space/voyagePhysics";

export type TimeScale = 1 | 10 | 100;
export type QualityTier = "low" | "medium" | "high";
export type FollowMode = "selected" | "ship";
/** Bounded per-tier budgets: geometry, textures, physics objects, prediction, post-processing, pixel ratio. */
export const QUALITY_BUDGETS: Record<QualityTier, { segments: number; clouds: boolean; post: boolean; maxObjects: number; prediction: number; dpr: number; stars: boolean; anisotropy: number }> = {
  low: { segments: 24, clouds: false, post: false, maxObjects: 16, prediction: 48, dpr: 1, stars: false, anisotropy: 2 },
  medium: { segments: 40, clouds: false, post: true, maxObjects: 32, prediction: 90, dpr: 1.25, stars: true, anisotropy: 4 },
  high: { segments: 64, clouds: true, post: true, maxObjects: 48, prediction: 120, dpr: 1.6, stars: true, anisotropy: 8 },
};

export interface VoyageInput { x: number; y: number; z: number; brake: boolean; orbitAssist: boolean; dock: boolean; thrustScale: number }
export interface CameraCommand { rotateX: number; rotateY: number; zoom: number }
export interface MapPoint { id: string; x: number; z: number }
export interface VoyageTelemetry {
  simTime: number; speedRel: number; speedAbs: number; reference: string; fuel: number; damage: number; altitude: number; gravity: number; closest: string;
  status: ShipStatus; contactLabel?: string; probes: number; throttle: number; throttleSetting: number; engineMode: EngineMode; fuelRate: number; thrustN: number; nearby: NearbyObject[]; planets: MapPoint[]; ship: MapPoint; objects: number;
  selectedRenderDistance: number; selectedRealDistanceKm: number; dockDistanceKm: number; dockRelSpeed: number;
}
interface Props {
  worldRef: React.MutableRefObject<WorldState>; inputRef: React.MutableRefObject<VoyageInput>; cameraCmdRef: React.MutableRefObject<CameraCommand>;
  timeScale: number; quality: QualityTier; labels: boolean; guides: boolean; showVelocity: boolean; reducedMotion: boolean; selected: string; follow: FollowMode;
  resetCamera: number; darkMatterEnabled: boolean; scanStartedAt: number | null; outerEnvelope: number; paused: boolean; onSelect: (id: string) => void; onTelemetry: (t: VoyageTelemetry) => void; onEvents: (e: StepEvent[]) => void; onFirstFrame: () => void; onFps: (fps: number) => void;
}

const tmp = new THREE.Vector3();

function Planet({ body, worldRef, quality, labels, onSelect }: { body: CelestialBodyData; worldRef: Props["worldRef"]; quality: QualityTier; labels: boolean; onSelect: (id: string) => void }) {
  const group = useRef<THREE.Group>(null), surface = useRef<THREE.Mesh>(null); const budget = QUALITY_BUDGETS[quality];
  const map = useLazyTexture(SPACE_TEXTURE_URLS[body.texture as keyof typeof SPACE_TEXTURE_URLS], { delay: 120, anisotropy: budget.anisotropy });
  const clouds = useLazyTexture(budget.clouds ? CLOUD_TEXTURE_URLS[body.texture] : undefined, { delay: 450, anisotropy: 4 });
  const ring = useLazyTexture(body.ring ? RING_TEXTURE_URL : undefined, { delay: 500, anisotropy: 4, srgb: true });
  const r = visualRadius(body.radiusKm);
  // Ring radii use the same local mapping as collisions, so the drawn annulus is the solid annulus.
  const ringInner = body.ring ? localVisualDistance(body.ring.innerKm, body) : 0, ringOuter = body.ring ? localVisualDistance(body.ring.outerKm, body) : 0;
  const ringQ = useMemo(() => (body.ring ? ringQuaternion(body.ring.tiltDeg) : new THREE.Quaternion()), [body.ring]);
  const zone = useMemo(() => (body.landingZone ? new THREE.Vector3(...body.landingZone.direction).normalize() : null), [body.landingZone]);
  const zoneQ = useMemo(() => (zone ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), zone) : new THREE.Quaternion()), [zone]);
  useFrame(() => {
    const t = worldRef.current.time;
    if (group.current) bodyRenderPosition(body, t, group.current.position);
    // Spin from the real sidereal period and simulated time: pauses with the simulation.
    if (surface.current) surface.current.rotation.y = spinAngleAt(body, t);
  });
  const ringGeo = useMemo(() => radialRingGeometry(ringInner || 1, ringOuter || 2), [ringInner, ringOuter]);
  useEffect(() => () => ringGeo.dispose(), [ringGeo]);
  return (
    <group ref={group}>
      <group rotation={[THREE.MathUtils.degToRad(body.axialTiltDeg), 0, 0]}>
        <mesh ref={surface} onClick={e => { e.stopPropagation(); onSelect(body.id); }}>
          <sphereGeometry args={[r, budget.segments, Math.round(budget.segments / 2)]} />
          <meshStandardMaterial key={map ? "tex" : "flat"} map={map ?? undefined} color={map ? "#ffffff" : "#8793a1"} roughness={0.95} metalness={0} />
        </mesh>
        {clouds && <mesh scale={1.012}><sphereGeometry args={[r, 48, 24]} /><meshStandardMaterial map={clouds} alphaMap={clouds} transparent opacity={0.7} depthWrite={false} /></mesh>}
      </group>
      {body.ring && (
        <group quaternion={ringQ}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <primitive object={ringGeo} attach="geometry" />
            <meshStandardMaterial key={ring ? "tex" : "flat"} map={ring ?? undefined} color={ring ? "#ffffff" : "#c8b892"} transparent opacity={0.92} alphaTest={0.02} side={THREE.DoubleSide} depthWrite={false} roughness={0.9} />
          </mesh>
        </group>
      )}
      {zone && body.landingZone && (
        <group position={zone.clone().multiplyScalar(r * 1.004)} quaternion={zoneQ}>
          <mesh><ringGeometry args={[r * 0.07, r * 0.1, 32]} /><meshBasicMaterial color="#5ef2a8" transparent opacity={0.85} side={THREE.DoubleSide} /></mesh>
        </group>
      )}
      {labels && <Html position={[0, r * 1.5, 0]} center zIndexRange={[20, 0]}><button type="button" onClick={() => onSelect(body.id)} className="whitespace-nowrap rounded border border-primary/40 bg-background/85 px-2 py-0.5 text-[10px] text-foreground">{body.name}</button></Html>}
    </group>
  );
}

/** Low tier: textured emissive sphere instead of the procedural photosphere shader (same collision radius). */
/** Ring texture strips run inner→outer along u; remap RingGeometry's planar UVs to radial ones. */
export function radialRingGeometry(inner: number, outer: number, segments = 128) {
  const g = new THREE.RingGeometry(inner, outer, segments, 1);
  const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
  uv.needsUpdate = true;
  return g;
}

function LiteSun() {
  const map = useLazyTexture(SUN_TEXTURE_URL, { delay: 60, anisotropy: 2 });
  return <mesh><sphereGeometry args={[SUN_VISUAL_RADIUS, 32, 16]} /><meshBasicMaterial key={map ? "tex" : "flat"} map={map ?? undefined} color={map ? "#ffffff" : "#ffcf7a"} toneMapped={false} /></mesh>;
}

function OrbitGuides() {
  return <group>{CELESTIAL_BODIES.map(b => { const rr = bodyRenderPosition(b, 0).length(); return <mesh key={b.id} rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[rr - 0.012, rr + 0.012, 192]} /><meshBasicMaterial color="#39dffc" transparent opacity={0.16} side={THREE.DoubleSide} /></mesh>; })}</group>;
}

function Obstacles({ worldRef }: { worldRef: Props["worldRef"] }) {
  const station = useRef<THREE.Group>(null), a1 = useRef<THREE.Mesh>(null), a2 = useRef<THREE.Mesh>(null);
  useFrame(() => { const t = worldRef.current.time; const o = physicalObstaclesAt(t); [station, a1, a2].forEach((ref, i) => { if (ref.current) renderPosition(o[i].position, t, ref.current.position); }); });
  // Artificial objects are drawn at a minimum visible size; their physical colliders are real-scale (see docs).
  return <>
    <group ref={station}><mesh><boxGeometry args={[0.03, 0.012, 0.018]} /><meshStandardMaterial color="#9fb3c4" metalness={0.8} roughness={0.35} /></mesh><mesh><sphereGeometry args={[0.05, 16, 8]} /><meshBasicMaterial color="#5ef2a8" wireframe transparent opacity={0.25} /></mesh></group>
    <mesh ref={a1}><icosahedronGeometry args={[0.05, 1]} /><meshStandardMaterial color="#7a7064" roughness={1} /></mesh>
    <mesh ref={a2}><icosahedronGeometry args={[0.06, 1]} /><meshStandardMaterial color="#6b625a" roughness={1} /></mesh>
  </>;
}

const KIND_COLOR = { probe: new THREE.Color("#7fe7ff"), debris: new THREE.Color("#a59a8c"), fragment: new THREE.Color("#ffb46b") };
function DynamicObjects({ worldRef, max }: { worldRef: Props["worldRef"]; max: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null); const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const im = mesh.current; if (!im) return; const w = worldRef.current; const n = Math.min(w.objects.length, max);
    for (let i = 0; i < n; i++) { const o = w.objects[i]; renderPosition(o.position, w.time, tmp); const s = o.kind === "debris" ? 0.022 : 0.012; m.makeScale(s, s, s).setPosition(tmp); im.setMatrixAt(i, m); im.setColorAt(i, KIND_COLOR[o.kind]); }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.6} metalness={0.3} emissive="#123040" /></instancedMesh>;
}

interface Effect { pos: THREE.Vector3; born: number; major: boolean }
function ImpactEffects({ effectsRef }: { effectsRef: React.MutableRefObject<Effect[]> }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const now = performance.now(); effectsRef.current = effectsRef.current.filter(e => now - e.born < 1400).slice(-4);
    meshes.current.forEach((mesh, i) => { if (!mesh) return; const e = effectsRef.current[i]; mesh.visible = !!e; if (!e) return; const k = (now - e.born) / 1400; mesh.position.copy(e.pos); mesh.scale.setScalar((e.major ? 0.25 : 0.06) * (0.2 + k)); (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85; });
  });
  return <>{[0, 1, 2, 3].map(i => <mesh key={i} ref={el => { meshes.current[i] = el; }} visible={false}><sphereGeometry args={[1, 20, 12]} /><meshBasicMaterial color="#ffc27a" transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}</>;
}

function CameraDirector({ controlsRef, subject, defaultDistance, minDistance, resetCamera, selected, follow, cmdRef }: { controlsRef: React.MutableRefObject<OrbitControlsImpl | null>; subject: () => THREE.Vector3; defaultDistance: number; minDistance: number; resetCamera: number; selected: string; follow: FollowMode; cmdRef: Props["cameraCmdRef"] }) {
  const { camera } = useThree(); const resetting = useRef(true); const sph = useMemo(() => new THREE.Spherical(), []); const off = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { resetting.current = true; }, [resetCamera, selected, follow]);
  useEffect(() => { const c = controlsRef.current; if (!c) return; const cancel = () => { resetting.current = false; }; c.addEventListener("start", cancel); return () => c.removeEventListener("start", cancel); }, [controlsRef]);
  useFrame((_, raw) => {
    const c = controlsRef.current; if (!c) return; const dt = Math.min(raw, 0.25); // camera easing tolerates slow frames
    c.minDistance = minDistance; c.maxDistance = 60;
    // Smooth focus: target eases toward the subject; the camera moves by the same delta (no teleport).
    const desired = subject(); const before = c.target.clone(); c.target.lerp(desired, 1 - Math.exp(-4 * dt)); camera.position.add(c.target.clone().sub(before));
    if (resetting.current) {
      // Frame from the sunlit side (Sun at origin) at a three-quarter angle so the day hemisphere and terminator are visible.
      const toSun = c.target.lengthSq() > 1e-6 ? c.target.clone().negate().normalize() : new THREE.Vector3(0, 0, 1);
      const side = new THREE.Vector3(0, 1, 0).cross(toSun).normalize();
      const goal = c.target.clone().add(toSun.multiplyScalar(0.75).add(side.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.38, 0)).normalize().multiplyScalar(defaultDistance));
      camera.position.lerp(goal, 1 - Math.exp(-2.5 * dt)); if (camera.position.distanceTo(goal) < defaultDistance * 0.01) resetting.current = false;
    }
    const cmd = cmdRef.current;
    if (cmd.rotateX || cmd.rotateY || cmd.zoom) {
      resetting.current = false; off.copy(camera.position).sub(c.target); sph.setFromVector3(off);
      sph.theta -= cmd.rotateX * 1.4 * dt; sph.phi = THREE.MathUtils.clamp(sph.phi - cmd.rotateY * 1.1 * dt, 0.05, Math.PI - 0.05);
      sph.radius = THREE.MathUtils.clamp(sph.radius * Math.exp(cmd.zoom * 1.3 * dt), minDistance, 60);
      camera.position.copy(c.target).add(off.setFromSpherical(sph));
    }
    c.update();
  });
  return null;
}

function Simulation(props: Props) {
  const { worldRef, inputRef } = props; const budget = QUALITY_BUDGETS[props.quality];
  const acc = useRef(0), lastHud = useRef(0), lastPred = useRef(0), first = useRef(false), fpsWin = useRef({ t: 0, n: 0 });
  const shipGroup = useRef<THREE.Group>(null), effectsRef = useRef<Effect[]>([]); const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const selectedBody = CELESTIAL_BODIES.find(b => b.id === props.selected) ?? CELESTIAL_BODIES[2];
  const trajectory = useMemo(() => { const g = new THREE.BufferGeometry(); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#58dfff", transparent: true, opacity: 0.55 })); }, []);
  const arrow = useMemo(() => new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.3, 0x7fffd4, 0.07, 0.04), []);
  useEffect(() => () => { trajectory.geometry.dispose(); (trajectory.material as THREE.Material).dispose(); arrow.dispose(); }, [trajectory, arrow]);
  const pendingEvents = useRef<StepEvent[]>([]);

  useFrame((_, rawDelta) => {
    if (!first.current) { first.current = true; props.onFirstFrame(); }
    const fw = fpsWin.current; fw.t += rawDelta; fw.n++; if (fw.t >= 2) { props.onFps(fw.n / fw.t); fw.t = 0; fw.n = 0; }
    const w = worldRef.current; const input = inputRef.current;
    const res = runFixedSteps(acc.current, props.timeScale > 0 ? rawDelta : 0, props.timeScale, dt => {
      const ev = stepWorld(w, { thrust: new THREE.Vector3(input.x, input.y, input.z), brake: input.brake, orbitAssistBody: input.orbitAssist ? selectedBody : undefined, dock: input.dock, thrustScale: input.thrustScale }, dt, budget.maxObjects);
      if (input.dock) input.dock = false; // one-shot request
      if (ev.length) pendingEvents.current.push(...ev);
    });
    acc.current = res.accumulator;
    if (pendingEvents.current.length) {
      for (const e of pendingEvents.current) if (e.type === "impact") effectsRef.current.push({ pos: renderPosition(e.position, w.time), born: performance.now(), major: e.impact.severity === "major" });
      props.onEvents(pendingEvents.current); pendingEvents.current = [];
    }
    // Ship render: the same physical→render mapping as every other object.
    const s = w.ship; const shipR = renderPosition(s.position, w.time);
    if (shipGroup.current) {
      shipGroup.current.position.copy(shipR); shipGroup.current.visible = s.status !== "destroyed";
      const f = thrustFrame(s.position, s.velocity, w.time); const ahead = renderPosition(s.position.clone().addScaledVector(f.relVel.lengthSq() > 1e-8 ? f.relVel : f.forward, 60), w.time).sub(shipR);
      if (ahead.lengthSq() > 1e-12) { const dir = ahead.normalize(); shipGroup.current.lookAt(shipR.clone().add(dir)); arrow.position.copy(shipR); arrow.setDirection(dir); arrow.setLength(0.12 + Math.min(0.4, f.relVel.length() * 0.03), 0.05, 0.03); }
      arrow.visible = props.showVelocity && s.status === "flying";
    }
    const now = performance.now();
    if (now - lastPred.current > 250) {
      lastPred.current = now; const pred = predictTrajectory(w, budget.prediction);
      trajectory.geometry.setFromPoints(pred.points.map(p => renderPosition(p, w.time))); trajectory.visible = s.status === "flying";
      (trajectory.material as THREE.LineBasicMaterial).color.set(pred.impactIndex >= 0 ? "#ff9b5e" : "#58dfff");
    }
    if (now - lastHud.current > 150) {
      lastHud.current = now; const frame = computeFrame(w.time); const g = gravityFromFrame(s.position, frame); const ref = referenceBody(s.position, w.time);
      const relV = ref ? s.velocity.clone().sub(bodyVelocityAt(ref, w.time)).length() : s.velocity.length(); const st = physicalObstaclesAt(w.time)[0];
      const selPos = bodyPositionAt(selectedBody, w.time);
      props.onTelemetry({
        simTime: w.time, speedRel: relV, speedAbs: s.velocity.length(), reference: ref?.name ?? SUN.name, fuel: s.fuelKg, damage: s.damage, altitude: g.altitudeKm, gravity: g.acceleration.length(),
        closest: g.closest === SUN.id ? SUN.name : CELESTIAL_BODIES.find(b => b.id === g.closest)?.name ?? g.closest, status: s.status, contactLabel: s.contactLabel, probes: s.probes, throttle: s.throttle, throttleSetting: s.throttleSetting, engineMode: s.engineMode, fuelRate: s.fuelRateKgS, thrustN: s.thrustN,
        nearby: nearbyObjects(w, 4), planets: CELESTIAL_BODIES.map(b => { const p = bodyRenderPosition(b, w.time); return { id: b.id, x: p.x, z: p.z }; }), ship: { id: "ship", x: shipR.x, z: shipR.z }, objects: w.objects.length,
        selectedRenderDistance: bodyRenderPosition(selectedBody, w.time).distanceTo(shipR), selectedRealDistanceKm: Math.max(0, s.position.distanceTo(selPos) - selectedBody.radiusKm),
        dockDistanceKm: s.position.distanceTo(st.position), dockRelSpeed: s.velocity.clone().sub(st.velocity).length(),
      });
    }
  });

  const subject = () => props.follow === "ship" ? renderPosition(worldRef.current.ship.position, worldRef.current.time) : bodyRenderPosition(selectedBody, worldRef.current.time);
  const vr = visualRadius(selectedBody.radiusKm);
  const animateField = !props.reducedMotion;
  return <>
    <DeepSky full={budget.stars} />
    <Starfield full={budget.stars} dpr={budget.dpr} boost={1} animate={animateField} lensEnabled={props.darkMatterEnabled} />
    <DarkMatterField enabled={props.darkMatterEnabled} scanStartedAt={props.scanStartedAt} reducedMotion={props.reducedMotion} paused={props.paused} outerEnvelope={props.outerEnvelope} />
    {/* Distances are log-compressed, so physical 1/r² falloff would blow out inner planets: use a constant-intensity sun light. */}
    <ambientLight intensity={0.035} color="#5d78ba" />
    <pointLight intensity={2.4} distance={0} decay={0} color="#fff4e2" />
    {props.quality === "low" ? <LiteSun /> : <group scale={SUN_VISUAL_RADIUS / PHOTO_RADIUS}><Sun full={props.quality === "high"} animate={animateField && props.timeScale > 0} steady /><SolarFlares radius={PHOTO_RADIUS} animate={animateField && props.timeScale > 0} full={props.quality === "high"} steady /></group>}
    {props.guides && <OrbitGuides />}
    {CELESTIAL_BODIES.map(b => <Planet key={b.id} body={b} worldRef={worldRef} quality={props.quality} labels={props.labels} onSelect={props.onSelect} />)}
    <Obstacles worldRef={worldRef} />
    <DynamicObjects worldRef={worldRef} max={budget.maxObjects} />
    <ImpactEffects effectsRef={effectsRef} />
    <group ref={shipGroup}><group scale={0.012}><MiningVessel animate={props.timeScale > 0 && animateField} throttle={worldRef.current.ship.throttle} crew={false} /></group><mesh><ringGeometry args={[0.028, 0.034, 24]} /><meshBasicMaterial color="#7fffd4" side={THREE.DoubleSide} transparent opacity={0.8} /></mesh></group>
    <primitive object={trajectory} />
    <primitive object={arrow} />
    <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} enablePan={false} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }} />
    <CameraDirector controlsRef={controlsRef} subject={subject} defaultDistance={props.follow === "ship" ? 0.5 : vr * 7} minDistance={props.follow === "ship" ? 0.06 : vr * 1.3} resetCamera={props.resetCamera} selected={props.selected} follow={props.follow} cmdRef={props.cameraCmdRef} />
    {budget.post && <EffectComposer multisampling={0}><Bloom intensity={0.35} luminanceThreshold={0.95} luminanceSmoothing={0.05} mipmapBlur /><Vignette offset={0.25} darkness={0.7} /></EffectComposer>}
  </>;
}
export default function VoyageScene(props: Props) { return <Simulation {...props} />; }
