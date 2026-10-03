import * as THREE from "three";

/**
 * Deterministic Voyage simulation core.
 *
 * Units: simulation state is kilometres, seconds, kilograms (km, km/s, km/s²).
 * Gravity uses real gravitational parameters (mu = G·M in km³/s²) with
 * Plummer softening: a = mu / (r² + ε²) toward each source.
 * Planets follow deterministic circular Kepler paths derived from real orbital
 * periods; ships, probes and debris are integrated with velocity Verlet
 * (kick–drift–kick) on a fixed timestep.
 */

// ---------- simulation constants ----------
/** 1× time scale = 60 simulated seconds per real second. */
export const SIM_SECONDS_PER_REAL_SECOND = 60;
/** Fixed integration substep in simulated seconds (independent of time scale). */
export const FIXED_STEP_SECONDS = 2;
/** Real frame delta cap — prevents catch-up jumps after stalls/tab switches. */
export const MAX_FRAME_SECONDS = 0.05;
/** 0.05 s × 100 × 60 / 2 s = 150 substeps per capped frame at 100×. */
export const MAX_SUBSTEPS = 160;
export const SOFTENING_KM = 250;

// ---------- ship constants ----------
export const SHIP_DRY_MASS_KG = 10_200;
export const SHIP_FUEL_KG = 1_800;
export const SHIP_THRUST_N = 144_000;
export const SHIP_ISP_S = 3_000;
export const G0 = 9.80665;
/**
 * Cruise drive: a disclosed, fictional high-performance engine (≈ fusion-torch class) that makes
 * interplanetary cruising playable in browser time. Gravity, inertia, fuel use and collisions are
 * computed exactly the same way as for the standard engine; only thrust and exhaust velocity differ.
 */
export const CRUISE_THRUST_N = 1_200_000;
export const CRUISE_ISP_S = 200_000;
export type EngineMode = "standard" | "cruise";
export const engineSpec = (m: EngineMode) => m === "cruise" ? { thrustN: CRUISE_THRUST_N, ispS: CRUISE_ISP_S } : { thrustN: SHIP_THRUST_N, ispS: SHIP_ISP_S };
export const clampThrottle = (v: number) => Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
export const SHIP_RADIUS_KM = 3;
export const PROBE_MASS_KG = 60;
export const PROBE_RADIUS_KM = 0.5;
export const PROBE_LAUNCH_KMS = 0.03;
export const PROBE_CAPACITY = 6;

// ---------- contact constants ----------
/** Max relative speed for docking or landing. */
export const SAFE_CONTACT_KMS = 0.08;
/** Below this relative normal speed an impact is a bounce/scrape. */
export const MINOR_IMPACT_KMS = 0.3;
/** Above this relative normal speed the ship is destroyed outright. */
export const CATASTROPHIC_KMS = 2.5;
/** Collision half-thickness of Saturn's ring slab (real rings ≈10 m–1 km; widened for robust contact). */
export const RING_HALF_THICKNESS_KM = 50;
const CONTACT_EPS_KM = 0.5;

// ---------- visual mapping constants ----------
export const VISUAL_RADIUS_REFERENCE_KM = 2_439.7;
export const VISUAL_RADIUS_K = 0.34;
export const LOCAL_LOG_K = 0.75;

export interface LandingZone { id: string; name: string; direction: [number, number, number]; angleDeg: number }
export interface CelestialBodyData {
  id: string; name: string; massKg: number; radiusKm: number; muKm3S2: number;
  semiMajorKm: number; periodDays: number; axialTiltDeg: number; rotationHours: number;
  surfaceGravity: number; collisionRadiusKm: number; phase: number; texture: string;
  source: string; ring?: { innerKm: number; outerKm: number; tiltDeg: number }; landingZone?: LandingZone;
}

export const CELESTIAL_BODIES: CelestialBodyData[] = [
  { id:"mercury",name:"Mercury",massKg:3.3011e23,radiusKm:2439.7,muKm3S2:22031.86855,semiMajorKm:57.909e6,periodDays:87.969,axialTiltDeg:0.034,rotationHours:1407.6,surfaceGravity:3.70,collisionRadiusKm:2439.7,phase:0.2,texture:"Mercury",source:"https://science.nasa.gov/mercury/facts/" },
  { id:"venus",name:"Venus",massKg:4.8675e24,radiusKm:6051.8,muKm3S2:324858.592,semiMajorKm:108.210e6,periodDays:224.701,axialTiltDeg:177.36,rotationHours:-5832.5,surfaceGravity:8.87,collisionRadiusKm:6051.8,phase:1.0,texture:"Venus",source:"https://science.nasa.gov/venus/facts/" },
  { id:"earth",name:"Earth",massKg:5.97237e24,radiusKm:6371,muKm3S2:398600.4355,semiMajorKm:149.598e6,periodDays:365.256,axialTiltDeg:23.44,rotationHours:23.934,surfaceGravity:9.81,collisionRadiusKm:6371,phase:1.9,texture:"Earth",source:"https://science.nasa.gov/earth/facts/",landingZone:{id:"earth-pad",name:"Equatorial Landing Pad",direction:[1,0,0],angleDeg:6} },
  { id:"mars",name:"Mars",massKg:6.4171e23,radiusKm:3389.5,muKm3S2:42828.3752,semiMajorKm:227.956e6,periodDays:686.98,axialTiltDeg:25.19,rotationHours:24.623,surfaceGravity:3.71,collisionRadiusKm:3389.5,phase:2.7,texture:"Mars",source:"https://science.nasa.gov/mars/facts/",landingZone:{id:"mars-zone",name:"Jezero Landing Zone",direction:[0,0,1],angleDeg:8} },
  { id:"jupiter",name:"Jupiter",massKg:1.8982e27,radiusKm:69911,muKm3S2:126686534,semiMajorKm:778.479e6,periodDays:4332.59,axialTiltDeg:3.13,rotationHours:9.925,surfaceGravity:24.79,collisionRadiusKm:69911,phase:3.5,texture:"Jupiter",source:"https://science.nasa.gov/jupiter/facts/" },
  { id:"saturn",name:"Saturn",massKg:5.6834e26,radiusKm:58232,muKm3S2:37931187,semiMajorKm:1433.53e6,periodDays:10759.22,axialTiltDeg:26.73,rotationHours:10.7,surfaceGravity:10.44,collisionRadiusKm:58232,phase:4.15,texture:"Saturn",source:"https://science.nasa.gov/saturn/facts/",ring:{innerKm:74500,outerKm:140220,tiltDeg:26.73} },
  { id:"uranus",name:"Uranus",massKg:8.681e25,radiusKm:25362,muKm3S2:5793939,semiMajorKm:2872.46e6,periodDays:30688.5,axialTiltDeg:97.77,rotationHours:-17.24,surfaceGravity:8.69,collisionRadiusKm:25362,phase:5.0,texture:"Uranus",source:"https://science.nasa.gov/uranus/facts/" },
  { id:"neptune",name:"Neptune",massKg:1.02413e26,radiusKm:24622,muKm3S2:6836529,semiMajorKm:4495.06e6,periodDays:60182,axialTiltDeg:28.32,rotationHours:16.11,surfaceGravity:11.15,collisionRadiusKm:24622,phase:5.7,texture:"Neptune",source:"https://science.nasa.gov/neptune/facts/" },
];
export const SUN = { id:"sun",name:"Sun",massKg:1.98847e30,radiusKm:695700,muKm3S2:132712440018,collisionRadiusKm:695700,source:"https://science.nasa.gov/sun/facts/" };
export const bodyById = (id: string) => CELESTIAL_BODIES.find(b => b.id === id);
/** Laplace sphere of influence a·(m/M☉)^(2/5) — used for the local reference frame and visual mapping. */
export const sphereOfInfluenceKm = (b: CelestialBodyData) => b.semiMajorKm * Math.pow(b.massKg / SUN.massKg, 0.4);

// ---------- planetary ephemeris (circular Kepler paths from real periods) ----------
const angleAt = (b: CelestialBodyData, t: number) => b.phase + (t / (b.periodDays * 86400)) * Math.PI * 2;
export const bodyPositionAt = (b: CelestialBodyData, t: number, out = new THREE.Vector3()) => { const a = angleAt(b, t); return out.set(Math.cos(a) * b.semiMajorKm, 0, Math.sin(a) * b.semiMajorKm); };
export const bodyVelocityAt = (b: CelestialBodyData, t: number, out = new THREE.Vector3()) => { const a = angleAt(b, t); const w = (Math.PI * 2) / (b.periodDays * 86400); return out.set(-Math.sin(a) * b.semiMajorKm * w, 0, Math.cos(a) * b.semiMajorKm * w); };
/** Surface spin angle from the real sidereal rotation period (sign = retrograde). */
export const spinAngleAt = (b: CelestialBodyData, t: number) => (t / (b.rotationHours * 3600)) * Math.PI * 2;

// ---------- small bodies & station ----------
const ASTEROIDS = [
  { id:"asteroid-1", name:"Survey Asteroid", semiMajorKm:420e6, phase:0.28, y:18000, radiusKm:18 },
  { id:"asteroid-2", name:"Iron Asteroid", semiMajorKm:440e6, phase:0.30, y:-12000, radiusKm:26 },
];
const asteroidState = (a: typeof ASTEROIDS[number], t: number) => {
  const w = Math.sqrt(SUN.muKm3S2 / a.semiMajorKm ** 3); const ang = a.phase + w * t;
  return { p: new THREE.Vector3(Math.cos(ang) * a.semiMajorKm, a.y, Math.sin(ang) * a.semiMajorKm), v: new THREE.Vector3(-Math.sin(ang) * a.semiMajorKm * w, 0, Math.cos(ang) * a.semiMajorKm * w) };
};
export const STATION = { id:"station", name:"Orbital Station", anchor:"earth", offsetKm:new THREE.Vector3(6371 + 780, 0, 0), halfExtentsKm:new THREE.Vector3(42, 16, 24), dockingZoneKm:68 };

export interface PhysicalObstacle { id:string; name:string; shape:"sphere"|"box"; position:THREE.Vector3; velocity:THREE.Vector3; radiusKm:number; halfExtentsKm?:THREE.Vector3; dockingZoneKm?:number }
export const physicalObstaclesAt = (t: number): PhysicalObstacle[] => {
  const earth = CELESTIAL_BODIES[2];
  return [
    { id:STATION.id, name:STATION.name, shape:"box", position:bodyPositionAt(earth, t).add(STATION.offsetKm), velocity:bodyVelocityAt(earth, t), radiusKm:Math.hypot(42, 16, 24), halfExtentsKm:STATION.halfExtentsKm, dockingZoneKm:STATION.dockingZoneKm },
    ...ASTEROIDS.map(a => { const s = asteroidState(a, t); return { id:a.id, name:a.name, shape:"sphere" as const, position:s.p, velocity:s.v, radiusKm:a.radiusKm }; }),
  ];
};

// ---------- gravity ----------
export interface BodyFrame { t: number; pos: THREE.Vector3[]; vel: THREE.Vector3[] }
/** index 0 = Sun, 1..8 = CELESTIAL_BODIES */
const frameCache: BodyFrame[] = [];
/** Memoised per time (the integrator reuses step n's end frame as step n+1's start frame). Treat as read-only. */
export const computeFrame = (t: number): BodyFrame => { const hit = frameCache.find(f => f.t === t); if (hit) return hit; const f = buildFrame(t); frameCache.unshift(f); if (frameCache.length > 4) frameCache.pop(); return f; };
const buildFrame = (t: number): BodyFrame => ({ t, pos: [new THREE.Vector3(), ...CELESTIAL_BODIES.map(b => bodyPositionAt(b, t))], vel: [new THREE.Vector3(), ...CELESTIAL_BODIES.map(b => bodyVelocityAt(b, t))] });
const MU = [SUN.muKm3S2, ...CELESTIAL_BODIES.map(b => b.muKm3S2)];
const SOURCE_IDS = [SUN.id, ...CELESTIAL_BODIES.map(b => b.id)];
const RADII = [SUN.radiusKm, ...CELESTIAL_BODIES.map(b => b.radiusKm)];

export function gravityFromFrame(p: THREE.Vector3, f: BodyFrame, out = new THREE.Vector3()) {
  out.set(0, 0, 0); let closest = 0, closestSurface = Infinity;
  for (let i = 0; i < MU.length; i++) {
    const dx = f.pos[i].x - p.x, dy = f.pos[i].y - p.y, dz = f.pos[i].z - p.z;
    const r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2);
    if (r - RADII[i] < closestSurface) { closestSurface = r - RADII[i]; closest = i; }
    if (r > 0) { const s = MU[i] / (r2 + SOFTENING_KM * SOFTENING_KM) / r; out.x += dx * s; out.y += dy * s; out.z += dz * s; }
  }
  return { acceleration: out, closestIndex: closest, closest: SOURCE_IDS[closest], altitudeKm: Math.max(0, closestSurface) };
}
export const softenedGravity = (p: THREE.Vector3, t: number) => gravityFromFrame(p, computeFrame(t));

/** Dominant reference body: the planet whose sphere of influence contains p (deepest), else the Sun. */
export function referenceBody(p: THREE.Vector3, t: number) {
  let best: CelestialBodyData | undefined, bestRatio = 1;
  for (const b of CELESTIAL_BODIES) { const r = p.distanceTo(bodyPositionAt(b, t)) / sphereOfInfluenceKm(b); if (r < bestRatio) { bestRatio = r; best = b; } }
  return best;
}

/** Prograde tangent of an orbit, robust to zero/polar radial or zero relative velocity. */
export function orbitTangent(radial: THREE.Vector3, relVel: THREE.Vector3) {
  const h = new THREE.Vector3().crossVectors(radial, relVel);
  if (h.lengthSq() < 1e-12 * Math.max(1, radial.lengthSq() * relVel.lengthSq())) {
    h.set(0, -1, 0);
    if (Math.abs(radial.clone().normalize().y) > 0.98) h.set(0, 0, -1);
  }
  const t = new THREE.Vector3().crossVectors(h, radial);
  return t.lengthSq() > 0 ? t.normalize() : new THREE.Vector3(1, 0, 0);
}
/** Circular speed consistent with the softened force: v = √(μ r / (r² + ε²)). */
export const softenedCircularSpeed = (mu: number, r: number) => Math.sqrt((mu * r) / (r * r + SOFTENING_KM * SOFTENING_KM));
export function orbitAssistVelocity(body: CelestialBodyData, shipPos: THREE.Vector3, t: number, shipVel = new THREE.Vector3()) {
  const center = bodyPositionAt(body, t), bv = bodyVelocityAt(body, t);
  const radial = shipPos.clone().sub(center);
  if (radial.lengthSq() === 0) radial.set(body.radiusKm, 0, 0);
  const r = Math.max(radial.length(), body.collisionRadiusKm + 20);
  return bv.addScaledVector(orbitTangent(radial, shipVel.clone().sub(bodyVelocityAt(body, t))), softenedCircularSpeed(body.muKm3S2, r));
}

// ---------- swept collision (earliest time of impact) ----------
export interface SweepHit { hit: boolean; t: number; normal: THREE.Vector3; /** corrected position relative to collider centre at time t */ contactRel: THREE.Vector3 }
const NO_HIT = (): SweepHit => ({ hit: false, t: 1, normal: new THREE.Vector3(1, 0, 0), contactRel: new THREE.Vector3() });

/**
 * Swept point against a sphere moving c0→c1 over the step. Solved in the
 * collider frame, so the earliest root of |s + t·d| = R is the first impact.
 */
export function sweptMovingSphereHit(start: THREE.Vector3, end: THREE.Vector3, c0: THREE.Vector3, c1: THREE.Vector3, radius: number): SweepHit {
  const s = start.clone().sub(c0), d = end.clone().sub(c1).sub(s);
  const a = d.lengthSq(), b = 2 * s.dot(d), c = s.lengthSq() - radius * radius;
  if (c <= 0) {
    const n = s.lengthSq() > 1e-12 ? s.clone().normalize() : a > 0 ? d.clone().normalize().negate() : new THREE.Vector3(1, 0, 0);
    return { hit: true, t: 0, normal: n, contactRel: n.clone().multiplyScalar(radius + CONTACT_EPS_KM) };
  }
  if (a < 1e-18) return NO_HIT();
  const disc = b * b - 4 * a * c; if (disc < 0) return NO_HIT();
  const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > 1) return NO_HIT();
  const n = s.addScaledVector(d, t).normalize();
  return { hit: true, t, normal: n, contactRel: n.clone().multiplyScalar(radius + CONTACT_EPS_KM) };
}
export const sweptSphereHit = (start: THREE.Vector3, end: THREE.Vector3, center: THREE.Vector3, radius: number) => sweptMovingSphereHit(start, end, center, center, radius);

/** Swept point vs axis-aligned box (Minkowski-padded by the ship radius), box moving c0→c1. */
export function sweptBoxHit(start: THREE.Vector3, end: THREE.Vector3, center: THREE.Vector3, half: THREE.Vector3, padding = 0, center1 = center): SweepHit {
  const s = start.clone().sub(center), d = end.clone().sub(center1).sub(s);
  const h = half.clone().addScalar(padding);
  const inside = Math.abs(s.x) <= h.x && Math.abs(s.y) <= h.y && Math.abs(s.z) <= h.z;
  if (inside) {
    let axis: "x"|"y"|"z" = "x", pen = Infinity;
    for (const k of ["x","y","z"] as const) { const p = h[k] - Math.abs(s[k]); if (p < pen) { pen = p; axis = k; } }
    const n = new THREE.Vector3(); n[axis] = Math.sign(s[axis]) || 1;
    const rel = s.clone(); rel[axis] = n[axis] * (h[axis] + CONTACT_EPS_KM);
    return { hit: true, t: 0, normal: n, contactRel: rel };
  }
  let tMin = 0, tMax = 1, axis: "x"|"y"|"z" = "x", sign = 1;
  for (const k of ["x","y","z"] as const) {
    if (Math.abs(d[k]) < 1e-12) { if (Math.abs(s[k]) > h[k]) return NO_HIT(); continue; }
    let t1 = (-h[k] - s[k]) / d[k], t2 = (h[k] - s[k]) / d[k], sg = -1;
    if (t1 > t2) { [t1, t2] = [t2, t1]; sg = 1; }
    if (t1 > tMin) { tMin = t1; axis = k; sign = sg; }
    tMax = Math.min(tMax, t2); if (tMin > tMax) return NO_HIT();
  }
  const n = new THREE.Vector3(); n[axis] = sign;
  const rel = s.addScaledVector(d, tMin); rel[axis] = sign * (h[axis] + CONTACT_EPS_KM);
  return { hit: true, t: tMin, normal: n, contactRel: rel };
}

export const ringQuaternion = (tiltDeg: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(tiltDeg), 0, 0));
/**
 * Swept point vs Saturn's tilted ring annulus with real thickness + ship radius.
 * Candidate times are slab-face crossings and inner/outer cylinder crossings;
 * the earliest candidate inside the solid is the impact. Handles coplanar
 * travel inside the slab and returns the tilted (world-space) normal.
 */
export function saturnRingHit(start: THREE.Vector3, end: THREE.Vector3, saturn0: THREE.Vector3, ring: NonNullable<CelestialBodyData["ring"]>, shipRadiusKm = 0, saturn1 = saturn0): SweepHit {
  const q = ringQuaternion(ring.tiltDeg), qi = q.clone().invert();
  const s = start.clone().sub(saturn0).applyQuaternion(qi), e = end.clone().sub(saturn1).applyQuaternion(qi), d = e.clone().sub(s);
  const h = RING_HALF_THICKNESS_KM + shipRadiusKm, rin = Math.max(0, ring.innerKm - shipRadiusKm), rout = ring.outerKm + shipRadiusKm;
  const inSolid = (p: THREE.Vector3) => { const r = Math.hypot(p.x, p.z); return Math.abs(p.y) <= h + 1e-6 && r >= rin - 1e-6 && r <= rout + 1e-6; };
  const cands: { t: number; kind: "start"|"top"|"bottom"|"inner"|"outer" }[] = [{ t: 0, kind: "start" }];
  if (Math.abs(d.y) > 1e-12) { cands.push({ t: (h - s.y) / d.y, kind: "top" }, { t: (-h - s.y) / d.y, kind: "bottom" }); }
  const a = d.x * d.x + d.z * d.z, b = 2 * (s.x * d.x + s.z * d.z), c0 = s.x * s.x + s.z * s.z;
  if (a > 1e-12) for (const [r, kind] of [[rin, "inner"], [rout, "outer"]] as const) { const disc = b * b - 4 * a * (c0 - r * r); if (disc >= 0) { const sq = Math.sqrt(disc); cands.push({ t: (-b - sq) / (2 * a), kind }, { t: (-b + sq) / (2 * a), kind }); } }
  cands.sort((x, y) => x.t - y.t);
  for (const cand of cands) {
    if (cand.t < 0 || cand.t > 1) continue;
    const p = s.clone().addScaledVector(d, cand.t); if (!inSolid(p)) continue;
    const n = new THREE.Vector3(); const rel = p.clone(); const r = Math.hypot(p.x, p.z) || 1;
    let kind = cand.kind;
    if (kind === "start") { // starting inside: push out through the nearest face
      const pens = { top: h - p.y, bottom: h + p.y, inner: r - rin, outer: rout - r };
      kind = (Object.entries(pens).sort((x, y) => x[1] - y[1])[0][0]) as typeof kind;
    }
    if (kind === "top") { n.set(0, 1, 0); rel.y = h + CONTACT_EPS_KM; }
    else if (kind === "bottom") { n.set(0, -1, 0); rel.y = -h - CONTACT_EPS_KM; }
    else if (kind === "inner") { n.set(-p.x / r, 0, -p.z / r); rel.x = (p.x / r) * (rin - CONTACT_EPS_KM); rel.z = (p.z / r) * (rin - CONTACT_EPS_KM); }
    else { n.set(p.x / r, 0, p.z / r); rel.x = (p.x / r) * (rout + CONTACT_EPS_KM); rel.z = (p.z / r) * (rout + CONTACT_EPS_KM); }
    return { hit: true, t: cand.t, normal: n.applyQuaternion(q), contactRel: rel.applyQuaternion(q) };
  }
  return NO_HIT();
}

export const canDock = (relativeSpeedKmS: number, distanceKm: number, zoneRadiusKm: number) => relativeSpeedKmS <= SAFE_CONTACT_KMS && distanceKm <= zoneRadiusKm;

// ---------- world ----------
export type ShipStatus = "flying"|"docked"|"landed"|"destroyed";
export interface ShipState {
  position: THREE.Vector3; velocity: THREE.Vector3; dryMassKg: number; collisionRadiusKm: number;
  angularVelocity: THREE.Vector3; fuelKg: number; damage: number; status: ShipStatus;
  attachedTo?: string; attachOffset?: THREE.Vector3; contactLabel?: string; probes: number;
  /** delivered thrust fraction (0..1) last step, all thrusters */
  throttle: number;
  /** persistent signed main-engine setting, -1 (full reverse) .. +1 (full forward) */
  throttleSetting: number;
  engineMode: EngineMode;
  /** unit vector the ship's nose points along (main engine axis) */
  heading: THREE.Vector3;
  /** actual fuel burn last step, kg/s */
  fuelRateKgS: number;
  /** actual delivered thrust last step, N */
  thrustN: number;
}
export const shipMass = (s: ShipState) => s.dryMassKg + s.fuelKg;
export type ObjectKind = "probe"|"debris"|"fragment";
export interface DynamicObject { id: number; kind: ObjectKind; position: THREE.Vector3; velocity: THREE.Vector3; massKg: number; radiusKm: number; age: number; maxAge: number }
export interface WorldState { time: number; ship: ShipState; objects: DynamicObject[]; nextId: number }
export interface PhysicsInput { thrust: THREE.Vector3; brake: boolean; orbitAssistBody?: CelestialBodyData; dock?: boolean; thrustScale?: number }
export interface Impact { bodyId: string; speedKmS: number; severity: "minor"|"major"; direction: THREE.Vector3; destroyed: boolean }
export type StepEvent =
  | { type: "impact"; impact: Impact; position: THREE.Vector3 }
  | { type: "docked"|"undocked"|"landed"|"liftoff"|"dock-denied"; label: string }
  | { type: "object-lost"; label: string; position: THREE.Vector3 };

const ZERO = new THREE.Vector3();
export function createShip(t: number): ShipState {
  const earth = CELESTIAL_BODIES[2]; const rel = new THREE.Vector3(earth.radiusKm + 900, 0, 0);
  const position = bodyPositionAt(earth, t).add(rel);
  const velocity = bodyVelocityAt(earth, t).addScaledVector(orbitTangent(rel, ZERO), softenedCircularSpeed(earth.muKm3S2, rel.length()));
  return { position, velocity, dryMassKg: SHIP_DRY_MASS_KG, collisionRadiusKm: SHIP_RADIUS_KM, angularVelocity: new THREE.Vector3(), fuelKg: SHIP_FUEL_KG, damage: 0, status: "flying", probes: PROBE_CAPACITY, throttle: 0, throttleSetting: 0, engineMode: "standard", heading: velocity.clone().sub(bodyVelocityAt(earth, t)).normalize(), fuelRateKgS: 0, thrustN: 0 };
}
export function createWorld(t = 0): WorldState {
  const earth = CELESTIAL_BODIES[2]; const rel = new THREE.Vector3(-(earth.radiusKm + 1200), 0, 0);
  const debrisV = bodyVelocityAt(earth, t).addScaledVector(new THREE.Vector3(0, 0.5, -Math.sqrt(0.75)), softenedCircularSpeed(earth.muKm3S2, rel.length()));
  return { time: t, ship: createShip(t), nextId: 2, objects: [{ id: 1, kind: "debris", position: bodyPositionAt(earth, t).add(rel), velocity: debrisV, massKg: 900, radiusKm: 4, age: 0, maxAge: Infinity }] };
}

interface Collider { id: string; name: string; kind: "sun"|"planet"|"ring"|"station"|"asteroid"; c0: THREE.Vector3; c1: THREE.Vector3; v: THREE.Vector3; radiusKm: number; body?: CelestialBodyData; half?: THREE.Vector3 }
function collidersBetween(f0: BodyFrame, f1: BodyFrame): Collider[] {
  const list: Collider[] = [{ id: SUN.id, name: SUN.name, kind: "sun", c0: f0.pos[0], c1: f1.pos[0], v: ZERO, radiusKm: SUN.radiusKm }];
  CELESTIAL_BODIES.forEach((b, i) => {
    list.push({ id: b.id, name: b.name, kind: "planet", c0: f0.pos[i + 1], c1: f1.pos[i + 1], v: f1.vel[i + 1], radiusKm: b.collisionRadiusKm, body: b });
    if (b.ring) list.push({ id: `${b.id}-rings`, name: `${b.name} rings`, kind: "ring", c0: f0.pos[i + 1], c1: f1.pos[i + 1], v: f1.vel[i + 1], radiusKm: b.ring.outerKm, body: b });
  });
  const o0 = physicalObstaclesAt(f0.t), o1 = physicalObstaclesAt(f1.t);
  o1.forEach((o, i) => list.push({ id: o.id, name: o.name, kind: o.shape === "box" ? "station" : "asteroid", c0: o0[i].position, c1: o.position, v: o.velocity, radiusKm: o.radiusKm, half: o.halfExtentsKm }));
  return list;
}
function sweepCollider(c: Collider, start: THREE.Vector3, end: THREE.Vector3, r: number): SweepHit {
  // Broad phase: skip when the segment is nowhere near the collider.
  const reach = start.distanceTo(end) + c0c1(c) + c.radiusKm + r + 1;
  if (start.distanceTo(c.c0) > reach + (c.kind === "ring" ? RING_HALF_THICKNESS_KM : 0)) return NO_HIT();
  if (c.kind === "ring" && c.body?.ring) return saturnRingHit(start, end, c.c0, c.body.ring, r, c.c1);
  if (c.kind === "station" && c.half) return sweptBoxHit(start, end, c.c0, c.half, r, c.c1);
  return sweptMovingSphereHit(start, end, c.c0, c.c1, c.radiusKm + r);
}
const c0c1 = (c: Collider) => c.c0.distanceTo(c.c1);

const anchorState = (id: string, t: number) => {
  if (id === STATION.id) { const o = physicalObstaclesAt(t)[0]; return { p: o.position, v: o.velocity }; }
  const b = bodyById(id)!; return { p: bodyPositionAt(b, t), v: bodyVelocityAt(b, t) };
};

/** Orbital thrust frame relative to the reference body: z prograde, y radial-out, x lateral (normal). */
export function thrustFrame(p: THREE.Vector3, v: THREE.Vector3, t: number) {
  const body = referenceBody(p, t); const c = body ? bodyPositionAt(body, t) : new THREE.Vector3(); const bv = body ? bodyVelocityAt(body, t) : new THREE.Vector3();
  const radial = p.clone().sub(c); const rel = v.clone().sub(bv);
  const forward = rel.lengthSq() > 1e-8 ? rel.clone().normalize() : orbitTangent(radial, rel);
  const up = radial.clone().addScaledVector(forward, -radial.dot(forward)); if (up.lengthSq() < 1e-12) up.set(0, 1, 0); up.normalize();
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  return { body, forward, up, right, relVel: rel };
}

/**
 * Thrust model. Main engine fires along `heading` at `throttleSetting` (signed); RCS (standard engine
 * rating) handles lateral/vertical/axial input, brake and orbit assist. Fuel burn = Σ thrust/(Isp·g0)
 * for what is actually delivered; if the step would use more fuel than remains, all thrust is scaled down.
 */
export function commandedThrust(ship: ShipState, input: PhysicsInput, t: number, dt: number) {
  const out = { acc: new THREE.Vector3(), fuelKg: 0, thrustN: 0, fraction: 0 };
  if (ship.status !== "flying" || ship.fuelKg <= 0) return out;
  const mass = shipMass(ship); const f = thrustFrame(ship.position, ship.velocity, t);
  if (f.relVel.lengthSq() > 1e-10) ship.heading.copy(f.forward); // nose holds prograde (relative to reference body)
  const main = engineSpec(ship.engineMode); const rcs = engineSpec("standard"); const scale = input.thrustScale ?? 1;
  const force = new THREE.Vector3(); let fuelRate = 0, thrustMag = 0;
  let setting = clampThrottle(ship.throttleSetting);
  if (input.brake) {
    // Brake: main engine (current mode) retro-fires against relative velocity, sized to stop without overshoot.
    setting = 0; const v = f.relVel.length();
    if (v > 1e-6) { const n = Math.min(main.thrustN, (v * 1000 * mass) / dt); force.addScaledVector(f.relVel.clone().normalize(), -n); fuelRate += n / (main.ispS * G0); thrustMag += n; }
  }
  if (setting !== 0) { const n = main.thrustN * Math.abs(setting); force.addScaledVector(ship.heading, n * Math.sign(setting)); fuelRate += n / (main.ispS * G0); thrustMag += n; }
  const r = new THREE.Vector3().addScaledVector(f.right, input.thrust.x).addScaledVector(f.up, input.thrust.y).addScaledVector(f.forward, input.thrust.z).multiplyScalar(scale);
  if (input.orbitAssistBody) { const delta = orbitAssistVelocity(input.orbitAssistBody, ship.position, t, ship.velocity).sub(ship.velocity); const acc = rcs.thrustN / mass / 1000; if (delta.length() > 1e-6) r.addScaledVector(delta.normalize(), Math.min(1, delta.length() / (acc * dt))); }
  if (r.length() > 1) r.normalize();
  if (r.lengthSq() > 0) { const n = rcs.thrustN * r.length(); force.addScaledVector(r, rcs.thrustN); fuelRate += n / (rcs.ispS * G0); thrustMag += n; }
  let k = 1; const need = fuelRate * dt; if (need > ship.fuelKg && need > 0) k = ship.fuelKg / need;
  out.acc.copy(force).multiplyScalar(k / mass / 1000); out.fuelKg = need * k; out.thrustN = thrustMag * k; out.fraction = Math.min(1, out.thrustN / main.thrustN);
  return out;
}

const seeded = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
function spawnFragments(world: WorldState, at: THREE.Vector3, vel: THREE.Vector3, count: number, maxObjects: number) {
  for (let i = 0; i < count && world.objects.length < maxObjects; i++) {
    const k = world.nextId + i; const dir = new THREE.Vector3(seeded(k) - .5, seeded(k + 7) - .5, seeded(k + 13) - .5).normalize();
    world.objects.push({ id: world.nextId++, kind: "fragment", position: at.clone().addScaledVector(dir, 5), velocity: vel.clone().addScaledVector(dir, 0.05 + seeded(k + 3) * 0.15), massKg: 120, radiusKm: 0.6, age: 0, maxAge: 3600 });
  }
}

/** Launch a probe along the prograde axis; ship recoils by momentum conservation. */
export function launchProbe(world: WorldState, maxObjects = 48): boolean {
  const s = world.ship; if (s.status !== "flying" || s.probes <= 0 || world.objects.length >= maxObjects) return false;
  const f = thrustFrame(s.position, s.velocity, world.time);
  world.objects.push({ id: world.nextId++, kind: "probe", position: s.position.clone().addScaledVector(f.forward, s.collisionRadiusKm + PROBE_RADIUS_KM + 2), velocity: s.velocity.clone().addScaledVector(f.forward, PROBE_LAUNCH_KMS), massKg: PROBE_MASS_KG, radiusKm: PROBE_RADIUS_KM, age: 0, maxAge: Infinity });
  s.dryMassKg -= PROBE_MASS_KG; // probes are carried in the dry mass
  s.velocity.addScaledVector(f.forward, -PROBE_LAUNCH_KMS * PROBE_MASS_KG / shipMass(s)); s.probes--;
  return true;
}

function integrate(p: THREE.Vector3, v: THREE.Vector3, extra: THREE.Vector3, f0: BodyFrame, f1: BodyFrame, dt: number) {
  const a0 = gravityFromFrame(p, f0).acceleration.add(extra);
  v.addScaledVector(a0, dt / 2); p.addScaledVector(v, dt);
  const a1 = gravityFromFrame(p, f1).acceleration.add(extra);
  v.addScaledVector(a1, dt / 2);
}

function resolveShipContact(world: WorldState, c: Collider, hit: SweepHit, events: StepEvent[], maxObjects: number) {
  const s = world.ship; const center = c.c0.clone().lerp(c.c1, hit.t);
  s.position.copy(center).add(hit.contactRel);
  const rel = s.velocity.clone().sub(c.v); const vn = rel.dot(hit.normal); const speed = Math.max(0, -vn);
  if (s.status === "destroyed") { if (vn < 0) rel.addScaledVector(hit.normal, -1.2 * vn).multiplyScalar(.5); s.velocity.copy(rel.add(c.v)); return; }
  // Landing zone: in-zone contact below the safe relative speed attaches to the surface.
  const zone = c.kind === "planet" ? c.body?.landingZone : undefined;
  if (zone && rel.length() <= SAFE_CONTACT_KMS && hit.normal.angleTo(new THREE.Vector3(...zone.direction)) <= THREE.MathUtils.degToRad(zone.angleDeg)) {
    s.status = "landed"; s.attachedTo = c.id; s.attachOffset = hit.normal.clone().multiplyScalar(c.radiusKm + s.collisionRadiusKm + CONTACT_EPS_KM); s.contactLabel = zone.name; s.velocity.copy(c.v);
    events.push({ type: "landed", label: `Landed at ${zone.name}` }); return;
  }
  if (vn >= 0) { s.velocity.copy(rel.add(c.v)); return; } // separating: positional correction only
  const minor = speed < MINOR_IMPACT_KMS; const e = minor ? 0.35 : 0.1;
  rel.addScaledVector(hit.normal, -(1 + e) * vn);
  const tangential = rel.clone().addScaledVector(hit.normal, -rel.dot(hit.normal)); rel.addScaledVector(tangential, minor ? -0.15 : -0.5);
  s.velocity.copy(rel.add(c.v));
  const destroyed = c.kind === "sun" || speed >= CATASTROPHIC_KMS;
  s.damage = destroyed ? 100 : Math.min(100, s.damage + (minor ? 2 + speed * 25 : speed * 60));
  const impact: Impact = { bodyId: c.id, speedKmS: speed, severity: minor && !destroyed ? "minor" : "major", direction: hit.normal.clone(), destroyed: destroyed || s.damage >= 100 };
  if (impact.destroyed) { s.status = "destroyed"; s.throttle = 0; s.throttleSetting = 0; s.thrustN = 0; s.fuelRateKgS = 0; spawnFragments(world, s.position, s.velocity, 8, maxObjects); }
  else if (!minor) spawnFragments(world, s.position, s.velocity, 3, maxObjects);
  events.push({ type: "impact", impact, position: s.position.clone() });
}

/** Advance the world by one fixed substep. */
export function stepWorld(world: WorldState, input: PhysicsInput, dt: number, maxObjects = 48): StepEvent[] {
  const events: StepEvent[] = []; const t0 = world.time, t1 = t0 + dt;
  const f0 = computeFrame(t0), f1 = computeFrame(t1); const colliders = collidersBetween(f0, f1);
  // dynamic objects
  const prevObj = new Map<number, THREE.Vector3>();
  world.objects = world.objects.filter(o => {
    o.age += dt; if (o.age > o.maxAge) return false;
    const prev = o.position.clone(); prevObj.set(o.id, prev); integrate(o.position, o.velocity, ZERO, f0, f1, dt);
    for (const c of colliders) { if (c.kind === "station" || c.kind === "asteroid") continue; const h = sweepCollider(c, prev, o.position, o.radiusKm); if (h.hit) { if (o.kind !== "fragment") events.push({ type: "object-lost", label: `${o.kind === "probe" ? "Probe" : "Debris"} impacted ${c.name}`, position: o.position.clone() }); return false; } }
    return true;
  });
  const s = world.ship; const mass = shipMass(s); const accel = SHIP_THRUST_N / mass / 1000;
  if (s.status === "docked" || s.status === "landed") {
    const a = anchorState(s.attachedTo!, t1); s.position.copy(a.p).add(s.attachOffset!); s.velocity.copy(a.v);
    s.throttle = 0; s.thrustN = 0; s.fuelRateKgS = 0;
    if (s.status === "docked") { s.fuelKg = Math.min(SHIP_FUEL_KG, s.fuelKg + 20 * dt); s.damage = Math.max(0, s.damage - 0.5 * dt); }
    const wantsOut = input.thrust.lengthSq() > 0 || (s.status === "docked" && input.dock === true);
    if (wantsOut && s.status === "landed" && s.fuelKg > 0) { s.velocity.addScaledVector(s.attachOffset!.clone().normalize(), 0.03); s.status = "flying"; events.push({ type: "liftoff", label: "Lift-off" }); s.attachedTo = undefined; }
    else if (wantsOut && s.status === "docked") { s.velocity.addScaledVector(s.attachOffset!.clone().normalize(), 0.02); s.status = "flying"; events.push({ type: "undocked", label: "Undocked from Orbital Station" }); s.attachedTo = undefined; }
    world.time = t1; return events;
  }
  const cmd = commandedThrust(s, input, t0, dt); s.throttle = cmd.fraction; s.thrustN = cmd.thrustN; s.fuelRateKgS = cmd.fuelKg / dt;
  const thrustAcc = cmd.acc;
  s.fuelKg = Math.max(0, s.fuelKg - cmd.fuelKg);
  const prev = s.position.clone(); integrate(s.position, s.velocity, thrustAcc, f0, f1, dt);
  // earliest impact across all solid colliders + dynamic objects
  let best: { c: Collider; h: SweepHit } | null = null;
  for (const c of colliders) { const h = sweepCollider(c, prev, s.position, s.collisionRadiusKm); if (h.hit && (!best || h.t < best.h.t)) best = { c, h }; }
  let objHit: { o: DynamicObject; h: SweepHit } | null = null;
  for (const o of world.objects) { if (o.age < 120 && o.kind !== "debris") continue; const op = prevObj.get(o.id) ?? o.position; const h = sweptMovingSphereHit(prev, s.position, op, o.position, o.radiusKm + s.collisionRadiusKm); if (h.hit && (!objHit || h.t < objHit.h.t)) objHit = { o, h }; }
  if (objHit && (!best || objHit.h.t < best.h.t)) {
    const { o, h } = objHit; const rel = s.velocity.clone().sub(o.velocity); const vn = rel.dot(h.normal);
    s.position.copy(o.position).add(h.contactRel);
    if (vn < 0) {
      const speed = -vn; const j = -(1 + 0.3) * vn / (1 / mass + 1 / o.massKg);
      s.velocity.addScaledVector(h.normal, j / mass); o.velocity.addScaledVector(h.normal, -j / o.massKg);
      if (s.status !== "destroyed") {
        s.damage = Math.min(100, s.damage + (speed < MINOR_IMPACT_KMS ? 2 + speed * 25 : speed * 60));
        const impact: Impact = { bodyId: o.kind, speedKmS: speed, severity: speed < MINOR_IMPACT_KMS ? "minor" : "major", direction: h.normal.clone(), destroyed: s.damage >= 100 };
        if (impact.destroyed) { s.status = "destroyed"; s.throttle = 0; s.throttleSetting = 0; s.thrustN = 0; s.fuelRateKgS = 0; spawnFragments(world, s.position, s.velocity, 8, maxObjects); }
        events.push({ type: "impact", impact, position: s.position.clone() });
      }
    }
  } else if (best) resolveShipContact(world, best.c, best.h, events, maxObjects);
  // docking request (only inside the designated station zone, below safe relative speed)
  if (input.dock && s.status === "flying") {
    const st = physicalObstaclesAt(t1)[0]; const dist = s.position.distanceTo(st.position); const relSpeed = s.velocity.clone().sub(st.velocity).length();
    if (canDock(relSpeed, dist, STATION.dockingZoneKm)) { s.status = "docked"; s.attachedTo = STATION.id; s.attachOffset = s.position.clone().sub(st.position); s.velocity.copy(st.velocity); s.contactLabel = STATION.name; events.push({ type: "docked", label: "Docked at Orbital Station" }); }
    else events.push({ type: "dock-denied", label: dist > STATION.dockingZoneKm ? `Docking denied: ${Math.round(dist)} km from port (zone ${STATION.dockingZoneKm} km)` : `Docking denied: relative speed ${(relSpeed * 1000).toFixed(0)} m/s (max ${SAFE_CONTACT_KMS * 1000} m/s)` });
  }
  world.time = t1; return events;
}

/**
 * Fixed-timestep driver. Real frame time is capped, scaled to simulated
 * seconds, and consumed in FIXED_STEP_SECONDS substeps. If the substep budget
 * is exhausted the remainder is dropped (no catch-up jump).
 */
export function runFixedSteps(accumulator: number, frameSeconds: number, timeScale: number, step: (dt: number) => void) {
  let next = accumulator + Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS) * timeScale * SIM_SECONDS_PER_REAL_SECOND; let steps = 0;
  while (next >= FIXED_STEP_SECONDS && steps < MAX_SUBSTEPS) { step(FIXED_STEP_SECONDS); next -= FIXED_STEP_SECONDS; steps++; }
  if (steps === MAX_SUBSTEPS) next = 0;
  return { accumulator: next, steps };
}

/**
 * Gravity-only ballistic prediction (no thrust) with adaptive step. Points are
 * expressed relative to the reference body and shifted to its current
 * position, so a closed orbit draws as a closed curve.
 */
export function predictTrajectory(world: WorldState, count = 120) {
  const s = world.ship; const p = s.position.clone(), v = s.velocity.clone(); let t = world.time;
  const ref = referenceBody(p, t); const now = ref ? bodyPositionAt(ref, t) : new THREE.Vector3();
  const points: THREE.Vector3[] = [p.clone()]; let impactIndex = -1;
  if (s.status !== "flying") return { points, referenceId: ref?.id ?? SUN.id, impactIndex };
  for (let i = 1; i < count; i++) {
    const g = softenedGravity(p, t); const rc = ref ? bodyPositionAt(ref, t) : new THREE.Vector3(); const rv = ref ? bodyVelocityAt(ref, t) : new THREE.Vector3();
    const rDist = p.distanceTo(rc); const relSpeed = Math.max(0.05, v.clone().sub(rv).length());
    const dt = THREE.MathUtils.clamp(0.04 * rDist / relSpeed, 4, 200_000);
    const f0 = computeFrame(t), f1 = computeFrame(t + dt); const prev = p.clone(); integrate(p, v, ZERO, f0, f1, dt); t += dt;
    const anchor = ref ? bodyPositionAt(ref, t) : new THREE.Vector3();
    points.push(p.clone().sub(anchor).add(now));
    let hit = g.altitudeKm <= 0;
    for (let k = 0; k < f1.pos.length && !hit; k++) hit = sweptMovingSphereHit(prev, p, f0.pos[k], f1.pos[k], RADII[k]).hit;
    if (hit) { impactIndex = i; break; }
  }
  return { points, referenceId: ref?.id ?? SUN.id, impactIndex };
}

// ---------- shared physical → render mapping ----------
/** r_visual = k · (r_real / r_Mercury)^(1/3) */
export const visualRadius = (radiusKm: number) => VISUAL_RADIUS_K * Math.cbrt(radiusKm / VISUAL_RADIUS_REFERENCE_KM);
/** Heliocentric distance compression: d_visual = 3.4 + 7.1·log10(1 + d / 4·10⁷ km). */
export const visualOrbitRadius = (km: number) => 3.4 + 7.1 * Math.log10(1 + km / 40_000_000);
export const SUN_VISUAL_RADIUS = visualOrbitRadius(SUN.radiusKm);
/** Local radial compression around a planet: surface (d = R) maps exactly to visualRadius(R). */
export const localVisualDistance = (dKm: number, body: CelestialBodyData) => { const vr = visualRadius(body.radiusKm); const x = dKm / body.radiusKm; return x <= 1 ? vr * x : vr * (1 + LOCAL_LOG_K * Math.log(x)); };
const projectHelio = (p: THREE.Vector3, out: THREE.Vector3) => { const l = p.length(); return l === 0 ? out.set(0, 0, 0) : out.copy(p).multiplyScalar(visualOrbitRadius(l) / l); };
/**
 * The single mapping used for every rendered physical object (planets, ship,
 * probes, debris, station, trajectory, minimap). It depends only on the
 * physical position and time — never on UI selection. Within a planet's
 * sphere of influence the mapping is radial around the planet so contact
 * surfaces render where collisions happen; near the SOI edge it blends to
 * the heliocentric mapping.
 */
export function renderPosition(p: THREE.Vector3, t: number, out = new THREE.Vector3()) {
  const global = projectHelio(p, new THREE.Vector3());
  let best: CelestialBodyData | undefined, bestRatio = 1, bestCenter = new THREE.Vector3(); const c = new THREE.Vector3();
  for (const b of CELESTIAL_BODIES) { bodyPositionAt(b, t, c); const r = p.distanceTo(c) / sphereOfInfluenceKm(b); if (r < bestRatio) { bestRatio = r; best = b; bestCenter = c.clone(); } }
  if (!best) return out.copy(global);
  const rel = p.clone().sub(bestCenter); const d = rel.length();
  const local = projectHelio(bestCenter, new THREE.Vector3()); if (d > 0) local.addScaledVector(rel, localVisualDistance(d, best) / d);
  const w = THREE.MathUtils.smoothstep(bestRatio, 0.25, 1);
  return out.copy(local).lerp(global, w);
}
export const bodyRenderPosition = (b: CelestialBodyData, t: number, out = new THREE.Vector3()) => projectHelio(bodyPositionAt(b, t), out);

export interface NearbyObject { id: string; name: string; distanceKm: number }
export function nearbyObjects(world: WorldState, limit = 4): NearbyObject[] {
  const p = world.ship.position, t = world.time;
  const list: NearbyObject[] = [{ id: SUN.id, name: SUN.name, distanceKm: p.length() - SUN.radiusKm }, ...CELESTIAL_BODIES.map(b => ({ id: b.id, name: b.name, distanceKm: p.distanceTo(bodyPositionAt(b, t)) - b.radiusKm })), ...physicalObstaclesAt(t).map(o => ({ id: o.id, name: o.name, distanceKm: Math.max(0, p.distanceTo(o.position) - o.radiusKm) })), ...world.objects.map(o => ({ id: `obj-${o.id}`, name: o.kind === "probe" ? `Probe #${o.id}` : o.kind === "debris" ? "Tracked debris" : "Hull fragment", distanceKm: Math.max(0, p.distanceTo(o.position) - o.radiusKm) }))];
  return list.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}
