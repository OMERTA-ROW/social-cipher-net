import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CELESTIAL_BODIES, FIXED_STEP_SECONDS, MAX_SUBSTEPS, RING_HALF_THICKNESS_KM, SAFE_CONTACT_KMS, SOFTENING_KM, SUN, STATION, bodyPositionAt, bodyVelocityAt, canDock, createWorld,
  launchProbe, localVisualDistance, orbitAssistVelocity, physicalObstaclesAt, predictTrajectory, renderPosition, bodyRenderPosition, ringQuaternion, runFixedSteps, saturnRingHit, softenedCircularSpeed,
  softenedGravity, stepWorld, sweptBoxHit, sweptMovingSphereHit, sweptSphereHit, visualRadius, shipMass, type PhysicsInput, type WorldState,
} from "./voyagePhysics";

const get = (id: string) => { const b = CELESTIAL_BODIES.find(x => x.id === id); if (!b) throw new Error(id); return b; };
const earth = get("earth"), jupiter = get("jupiter"), saturn = get("saturn"), mars = get("mars");
const idle: PhysicsInput = { thrust: new THREE.Vector3(), brake: false };
const placeShip = (w: WorldState, body: typeof earth, rel: THREE.Vector3, relVel: THREE.Vector3) => { w.ship.position.copy(bodyPositionAt(body, w.time)).add(rel); w.ship.velocity.copy(bodyVelocityAt(body, w.time)).add(relVel); w.objects = []; };
const run = (w: WorldState, seconds: number, input = idle) => { const ev = []; for (let s = 0; s < seconds; s += FIXED_STEP_SECONDS) ev.push(...stepWorld(w, input, FIXED_STEP_SECONDS)); return ev; };

describe("bodies & scaling", () => {
  it("keeps real diameter ratios and compresses only visually", () => {
    expect(jupiter.radiusKm / get("mercury").radiusKm).toBeGreaterThan(28);
    expect(visualRadius(jupiter.radiusKm)).toBeGreaterThan(visualRadius(earth.radiusKm));
    expect(visualRadius(mars.radiusKm)).toBeLessThan(visualRadius(saturn.radiusKm));
  });
  it("render mapping puts planet surfaces exactly where contact occurs, independent of selection", () => {
    const t = 1234; const surface = bodyPositionAt(earth, t).add(new THREE.Vector3(0, earth.radiusKm, 0));
    const d = renderPosition(surface, t).distanceTo(bodyRenderPosition(earth, t));
    expect(d).toBeCloseTo(visualRadius(earth.radiusKm), 5);
    expect(localVisualDistance(earth.radiusKm, earth)).toBeCloseTo(visualRadius(earth.radiusKm), 9);
    expect(renderPosition(surface, t).equals(renderPosition(surface.clone(), t))).toBe(true);
  });
});

describe("gravity", () => {
  it("attracts toward the body and grows as distance shrinks", () => {
    const e = bodyPositionAt(earth, 0);
    const near = softenedGravity(e.clone().add(new THREE.Vector3(earth.radiusKm + 1000, 0, 0)), 0);
    const far = softenedGravity(e.clone().add(new THREE.Vector3(earth.radiusKm + 10000, 0, 0)), 0);
    expect(near.closest).toBe("earth"); expect(near.acceleration.x).toBeLessThan(0);
    expect(near.acceleration.length()).toBeGreaterThan(far.acceleration.length());
  });
  it("scales with mass: Jupiter pulls harder than Earth at the same distance", () => {
    const r = 200_000; const gj = softenedGravity(bodyPositionAt(jupiter, 0).add(new THREE.Vector3(r, 0, 0)), 0).acceleration.length();
    const ge = softenedGravity(bodyPositionAt(earth, 0).add(new THREE.Vector3(r, 0, 0)), 0).acceleration.length();
    expect(gj / ge).toBeGreaterThan(50);
  });
  it("the Sun dominates in deep space", () => { expect(softenedGravity(new THREE.Vector3(3e8, 1e7, 0), 0).acceleration.x).toBeLessThan(0); });
});

describe("orbit assist", () => {
  it("matches the softened circular speed relative to the moving planet", () => {
    const rel = new THREE.Vector3(earth.radiusKm + 400, 0, 0); const v = orbitAssistVelocity(earth, bodyPositionAt(earth, 0).add(rel), 0);
    const relSpeed = v.sub(bodyVelocityAt(earth, 0)).length();
    expect(relSpeed).toBeCloseTo(Math.sqrt(earth.muKm3S2 * rel.length() / (rel.length() ** 2 + SOFTENING_KM ** 2)), 6);
  });
  it("is robust for polar and zero radial vectors", () => {
    const polar = orbitAssistVelocity(earth, bodyPositionAt(earth, 0).add(new THREE.Vector3(0, 8000, 0)), 0);
    const zero = orbitAssistVelocity(earth, bodyPositionAt(earth, 0), 0);
    for (const v of [polar, zero]) expect(Number.isFinite(v.length())).toBe(true);
  });
  it("orbit-assist thrust converges an eccentric state toward circular", () => {
    const w = createWorld(0); placeShip(w, earth, new THREE.Vector3(earth.radiusKm + 2000, 0, 0), new THREE.Vector3(0, 0, 6));
    run(w, 600, { ...idle, orbitAssistBody: earth });
    const rel = w.ship.position.clone().sub(bodyPositionAt(earth, w.time)); const rv = w.ship.velocity.clone().sub(bodyVelocityAt(earth, w.time));
    expect(Math.abs(rv.length() - softenedCircularSpeed(earth.muKm3S2, rel.length()))).toBeLessThan(0.05);
  });
});

describe("integration stability", () => {
  it("initial/reset ship velocity includes Earth's orbital velocity", () => {
    const w = createWorld(500); expect(w.ship.velocity.clone().sub(bodyVelocityAt(earth, 500)).length()).toBeCloseTo(softenedCircularSpeed(earth.muKm3S2, earth.radiusKm + 900), 6);
  });
  it("holds a circular LEO for 3 orbits with <1% radius drift", () => {
    const w = createWorld(0); w.objects = []; const r0 = earth.radiusKm + 900; const period = 2 * Math.PI * r0 / softenedCircularSpeed(earth.muKm3S2, r0);
    let min = Infinity, max = 0;
    for (let s = 0; s < period * 3; s += FIXED_STEP_SECONDS) { stepWorld(w, idle, FIXED_STEP_SECONDS); const r = w.ship.position.distanceTo(bodyPositionAt(earth, w.time)); min = Math.min(min, r); max = Math.max(max, r); }
    expect(w.ship.status).toBe("flying"); expect((max - min) / r0).toBeLessThan(0.01);
  });
  it("bounds substeps and drops the remainder at 100× (no catch-up)", () => {
    const capped = runFixedSteps(0, 0.05, 100, () => undefined); expect(capped.steps).toBe(150);
    const stall = runFixedSteps(0, 5, 100, () => undefined); expect(stall.steps).toBe(150);
    expect(stall.steps).toBeLessThanOrEqual(MAX_SUBSTEPS);
    expect(runFixedSteps(0, 1 / 60, 1, () => undefined).steps).toBe(0); // 1 sim-s < 2 s step, carried
  });
  it("stays in orbit across 600 frames at 100×", () => {
    const w = createWorld(0); w.objects = []; let acc = 0; const r0 = earth.radiusKm + 900;
    for (let i = 0; i < 600; i++) acc = runFixedSteps(acc, 1 / 30, 100, dt => stepWorld(w, idle, dt)).accumulator;
    const r = w.ship.position.distanceTo(bodyPositionAt(earth, w.time));
    expect(Math.abs(r - r0) / r0).toBeLessThan(0.01); expect(w.ship.status).toBe("flying");
  });
});

describe("swept collisions", () => {
  it("returns the first time of impact, not the closest approach", () => {
    const h = sweptSphereHit(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0), new THREE.Vector3(), 2);
    expect(h.hit).toBe(true); expect(h.t).toBeCloseTo(0.4, 6); expect(h.normal.x).toBeCloseTo(-1, 6);
  });
  it("detects moving colliders that a static test would miss", () => {
    const start = new THREE.Vector3(0, 0, 0), end = new THREE.Vector3(0, 0, 0);
    expect(sweptMovingSphereHit(start, end, new THREE.Vector3(10, 0, 0), new THREE.Vector3(-10, 0, 0), 1).hit).toBe(true);
    expect(sweptSphereHit(start, end, new THREE.Vector3(10, 0, 0), 1).hit).toBe(false);
  });
  it("box sweep reports entry face normal and corrects penetration", () => {
    const h = sweptBoxHit(new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0), new THREE.Vector3(), new THREE.Vector3(10, 10, 10), 3);
    expect(h.t).toBeCloseTo(87 / 200, 6); expect(h.normal.x).toBe(-1);
    const inside = sweptBoxHit(new THREE.Vector3(0, 12, 0), new THREE.Vector3(0, 12, 0), new THREE.Vector3(), new THREE.Vector3(10, 10, 10), 3);
    expect(inside.normal.y).toBe(1); expect(inside.contactRel.y).toBeGreaterThan(13);
  });
  it("collides with the Sun and destroys the ship", () => {
    const w = createWorld(0); w.objects = []; w.ship.position.set(SUN.radiusKm + 100, 0, 0); w.ship.velocity.set(-200, 0, 0);
    const ev = stepWorld(w, idle, FIXED_STEP_SECONDS);
    expect(ev.some(e => e.type === "impact" && e.impact.bodyId === "sun")).toBe(true); expect(w.ship.status).toBe("destroyed");
    expect(w.ship.position.length()).toBeGreaterThan(SUN.radiusKm);
  });
  it("stops a 1000 km/s ship tunnelling through Earth", () => {
    const w = createWorld(0); placeShip(w, earth, new THREE.Vector3(earth.radiusKm + 500, 0, 0), new THREE.Vector3(-1000, 0, 0));
    const ev = stepWorld(w, idle, FIXED_STEP_SECONDS);
    expect(ev.some(e => e.type === "impact" && e.impact.bodyId === "earth")).toBe(true);
    expect(w.ship.position.distanceTo(bodyPositionAt(earth, w.time))).toBeGreaterThan(earth.radiusKm);
  });
});

describe("Saturn rings", () => {
  const ring = saturn.ring!; const q = ringQuaternion(ring.tiltDeg); const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(q);
  it("hits the tilted annulus and returns the tilted normal, not world Y", () => {
    const h = saturnRingHit(local(100000, -500, 0), local(100000, 500, 0), new THREE.Vector3(), ring, 3);
    expect(h.hit).toBe(true); expect(h.normal.angleTo(local(0, -1, 0))).toBeLessThan(1e-6); expect(Math.abs(h.normal.y)).toBeLessThan(0.95);
  });
  it("passes through the central gap", () => { expect(saturnRingHit(local(0, -1000, 0), local(0, 1000, 0), new THREE.Vector3(), ring).hit).toBe(false); });
  it("respects thickness: coplanar travel inside the slab hits the inner edge", () => {
    const h = saturnRingHit(local(60000, 10, 0), local(80000, 10, 0), new THREE.Vector3(), ring, 3);
    expect(h.hit).toBe(true); expect(h.normal.angleTo(local(-1, 0, 0))).toBeLessThan(1e-6);
  });
  it("corrects penetration for a ship starting inside the slab", () => {
    const h = saturnRingHit(local(100000, 5, 0), local(100000, 5, 0), new THREE.Vector3(), ring, 3);
    const back = h.contactRel.clone().applyQuaternion(q.clone().invert()); expect(Math.abs(back.y)).toBeGreaterThan(RING_HALF_THICKNESS_KM + 3);
  });
  it("is integrated into world stepping with Saturn's motion", () => {
    const w = createWorld(0); placeShip(w, saturn, local(100000, 400, 0), local(0, -0.5, 0).add(new THREE.Vector3()));
    // cancel Saturn gravity effect by short steps; one 2 s step at 0.5 km/s covers 1 km, so start near the slab
    w.ship.position.copy(bodyPositionAt(saturn, 0)).add(local(100000, RING_HALF_THICKNESS_KM + 3.5, 0));
    const ev = run(w, 10); expect(ev.some(e => e.type === "impact" && e.impact.bodyId === "saturn-rings")).toBe(true);
  });
});

describe("impacts, docking, landing", () => {
  it("uses station-relative velocity (co-moving slow contact is minor)", () => {
    const w = createWorld(0); const st = physicalObstaclesAt(0)[0]; w.objects = [];
    w.ship.position.copy(st.position).add(new THREE.Vector3(0, 0, 24 + 3 + 1)); w.ship.velocity.copy(st.velocity).add(new THREE.Vector3(0, 0, -0.1));
    const ev = run(w, 20); const imp = ev.find(e => e.type === "impact");
    expect(imp && imp.type === "impact" && imp.impact.bodyId).toBe("station");
    expect(imp && imp.type === "impact" && imp.impact.speedKmS).toBeLessThan(0.2);
  });
  it("low-speed impacts bounce with minor damage, high-speed impacts are major", () => {
    const mk = (speed: number) => { const w = createWorld(0); placeShip(w, earth, new THREE.Vector3(0, 0, -(earth.radiusKm + 3.2)), new THREE.Vector3(0, 0, speed)); return w; };
    const low = mk(0.15), high = mk(1.5);
    const el = stepWorld(low, idle, FIXED_STEP_SECONDS).find(e => e.type === "impact"); const eh = stepWorld(high, idle, FIXED_STEP_SECONDS).find(e => e.type === "impact");
    expect(el?.type === "impact" && el.impact.severity).toBe("minor"); expect(eh?.type === "impact" && eh.impact.severity).toBe("major");
    expect(high.ship.damage).toBeGreaterThan(low.ship.damage);
  });
  it("lands only inside the designated zone below safe speed", () => {
    const zone = new THREE.Vector3(...earth.landingZone!.direction);
    const inZone = createWorld(0); placeShip(inZone, earth, zone.clone().multiplyScalar(earth.radiusKm + 3.2), zone.clone().multiplyScalar(-0.02));
    expect(run(inZone, 10).some(e => e.type === "landed")).toBe(true); expect(inZone.ship.status).toBe("landed");
    const outZone = createWorld(0); const off = new THREE.Vector3(0, 0, 1); placeShip(outZone, earth, off.clone().multiplyScalar(earth.radiusKm + 3.6), off.clone().multiplyScalar(-0.05));
    run(outZone, 10); expect(outZone.ship.status).toBe("flying");
    const fast = createWorld(0); placeShip(fast, earth, zone.clone().multiplyScalar(earth.radiusKm + 4), zone.clone().multiplyScalar(-(SAFE_CONTACT_KMS + 0.2)));
    run(fast, 6); expect(fast.ship.status).not.toBe("landed");
  });
  it("docks only on request, inside the zone and below safe relative speed", () => {
    expect(canDock(.05, 5, 10)).toBe(true); expect(canDock(.2, 5, 10)).toBe(false); expect(canDock(.05, 20, 10)).toBe(false);
    const w = createWorld(0); w.objects = []; const st = physicalObstaclesAt(0)[0];
    w.ship.position.copy(st.position).add(new THREE.Vector3(0, 50, 0)); w.ship.velocity.copy(st.velocity);
    expect(stepWorld(w, idle, FIXED_STEP_SECONDS).some(e => e.type === "docked")).toBe(false);
    expect(stepWorld(w, { ...idle, dock: true }, FIXED_STEP_SECONDS).some(e => e.type === "docked")).toBe(true); expect(w.ship.status).toBe("docked");
    const far = createWorld(0); expect(stepWorld(far, { ...idle, dock: true }, FIXED_STEP_SECONDS).some(e => e.type === "dock-denied")).toBe(true);
    expect(STATION.dockingZoneKm).toBeGreaterThan(0);
  });
  it("destruction disables propulsion", () => {
    const w = createWorld(0); w.objects = []; w.ship.status = "destroyed"; const fuel = w.ship.fuelKg;
    stepWorld(w, { ...idle, thrust: new THREE.Vector3(0, 0, 1) }, FIXED_STEP_SECONDS);
    expect(w.ship.fuelKg).toBe(fuel); expect(w.ship.throttle).toBe(0);
  });
});

describe("launches & prediction", () => {
  it("probe launch conserves momentum and the probe falls under gravity", () => {
    const w = createWorld(0); w.objects = []; const m = shipMass(w.ship); const before = w.ship.velocity.clone().multiplyScalar(m);
    expect(launchProbe(w)).toBe(true); const probe = w.objects[0];
    const after = w.ship.velocity.clone().multiplyScalar(m).add(probe.velocity.clone().multiplyScalar(probe.massKg));
    expect(after.sub(before).length() / before.length()).toBeLessThan(1e-3);
    const v0 = probe.velocity.clone(); run(w, 60); expect(probe.velocity.distanceTo(v0)).toBeGreaterThan(0.1);
  });
  it("thrust consumes fuel", () => { const w = createWorld(0); const f = w.ship.fuelKg; run(w, 20, { ...idle, thrust: new THREE.Vector3(0, 0, 1) }); expect(w.ship.fuelKg).toBeLessThan(f); });
  it("prediction is gravity-curved, not a straight line", () => {
    const w = createWorld(0); const { points } = predictTrajectory(w, 60);
    const a = points[0], b = points[10], c = points[30]; const ab = b.clone().sub(a).normalize(), ac = c.clone().sub(a).normalize();
    expect(ab.angleTo(ac)).toBeGreaterThan(0.1);
  });
});
