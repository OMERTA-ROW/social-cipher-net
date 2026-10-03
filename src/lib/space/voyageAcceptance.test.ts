/** Acceptance regressions reported by the independent physics audit (2026-10-03). */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CELESTIAL_BODIES, FIXED_STEP_SECONDS, MAX_SUBSTEPS, SOFTENING_KM, RING_HALF_THICKNESS_KM, SUN,
  bodyPositionAt, bodyVelocityAt, commandedThrust, createWorld, orbitAssistVelocity, runFixedSteps,
  physicalObstaclesAt, saturnRingHit, softenedCircularSpeed, stepWorld, sweptSphereHit, type PhysicsInput,
} from "./voyagePhysics";

const earth = CELESTIAL_BODIES[2];
const saturn = CELESTIAL_BODIES.find((b) => b.id === "saturn")!;
const idle = (): PhysicsInput => ({ thrust: new THREE.Vector3(), brake: false });

describe("audit acceptance", () => {
  it("swept sphere reports first contact (t=0.4), not closest approach", () => {
    const h = sweptSphereHit(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0), new THREE.Vector3(), 2);
    expect(h.hit).toBe(true);
    expect(h.t).toBeCloseTo(0.4, 9);
  });

  it("flying into the Sun produces a Sun impact", () => {
    const w = createWorld(0); w.objects = [];
    w.ship.position.set(SUN.radiusKm + 50, 0, 0); w.ship.velocity.set(-100, 0, 0);
    const ev = stepWorld(w, idle(), FIXED_STEP_SECONDS);
    const impact = ev.find((e) => e.type === "impact");
    expect(impact && "impact" in impact ? impact.impact?.bodyId : undefined).toBe("sun");
  });

  it("orbit assist over a pole gives a non-zero tangential relative speed", () => {
    const t = 0; const c = bodyPositionAt(earth, t); const r = earth.radiusKm + 900;
    const pos = c.clone().add(new THREE.Vector3(0, r, 0));
    const rel = orbitAssistVelocity(earth, pos, t, bodyVelocityAt(earth, t)).sub(bodyVelocityAt(earth, t));
    expect(rel.length()).toBeCloseTo(softenedCircularSpeed(earth.muKm3S2, r), 9);
    expect(Math.abs(rel.dot(new THREE.Vector3(0, 1, 0)))).toBeLessThan(1e-9);
  });

  it("circular speed matches the softened force exactly: v²/r = μ/(r²+ε²)", () => {
    for (const r of [earth.radiusKm + 400, 20_000, 4_790]) {
      const v = softenedCircularSpeed(earth.muKm3S2, r);
      expect((v * v) / r).toBeCloseTo(earth.muKm3S2 / (r * r + SOFTENING_KM ** 2), 15);
    }
  });

  it("25% throttle delivers 25% of full-throttle acceleration (unconstrained fuel)", () => {
    const acc = (setting: number) => {
      const w = createWorld(0); w.ship.throttleSetting = setting;
      return commandedThrust(w.ship, idle(), 0, 1).acc.length();
    };
    expect(acc(0.25) / acc(1)).toBeCloseTo(0.25, 9);
  });

  it("a ship at 100% damage cannot thrust or burn fuel", () => {
    const w = createWorld(0); w.objects = []; w.ship.damage = 100; w.ship.throttleSetting = 1;
    const fuel = w.ship.fuelKg;
    stepWorld(w, idle(), FIXED_STEP_SECONDS);
    expect(w.ship.fuelKg).toBe(fuel);
    expect(w.ship.thrustN).toBe(0);
  });

  it("coplanar travel through the ring annulus is detected", () => {
    const ring = saturn.ring!; const c = new THREE.Vector3();
    const mid = (ring.innerKm + ring.outerKm) / 2;
    // In the tilted ring plane, starting outside the outer edge and travelling inward.
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(ring.tiltDeg), 0, 0));
    const start = new THREE.Vector3(ring.outerKm + 5_000, 0, 0).applyQuaternion(q);
    const end = new THREE.Vector3(mid, 0, 0).applyQuaternion(q);
    const h = saturnRingHit(start, end, c, ring, 3);
    expect(h.hit).toBe(true);
    expect(RING_HALF_THICKNESS_KM).toBeGreaterThan(0);
  });

  it("100× runs constant fixed substeps with a bounded count", () => {
    const dts: number[] = [];
    const r = runFixedSteps(0, 1 / 60, 100, (dt) => dts.push(dt));
    expect(dts.every((d) => d === FIXED_STEP_SECONDS)).toBe(true);
    expect(r.steps).toBeLessThanOrEqual(MAX_SUBSTEPS);
    const huge: number[] = []; runFixedSteps(0, 10, 100, (dt) => huge.push(dt));
    expect(huge.length).toBeLessThanOrEqual(MAX_SUBSTEPS);
  });

  it("near-empty fuel (1e-9 kg) caps the impulse to the fuel actually burned", () => {
    const w = createWorld(0); w.objects = []; w.ship.fuelKg = 1e-9; w.ship.throttleSetting = 1;
    const w0 = createWorld(0); w0.objects = []; w0.ship.fuelKg = 0;
    stepWorld(w, idle(), 2); stepWorld(w0, idle(), 2);
    expect(w.ship.velocity.distanceTo(w0.ship.velocity)).toBeLessThan(1e-9);
    expect(w.ship.fuelKg).toBe(0);
  });

  it("a fast probe crossing the station is stopped by it", () => {
    const w = createWorld(0); w.ship.position.set(1e9, 0, 0);
    const st = physicalObstaclesAt(0)[0];
    w.objects = [{ id: 999, kind: "probe", position: st.position.clone().add(new THREE.Vector3(100, 0, 0)), velocity: st.velocity.clone().add(new THREE.Vector3(-200, 0, 0)), massKg: 60, radiusKm: 0.5, age: 0, maxAge: 1e6 }];
    const ev = stepWorld(w, idle(), FIXED_STEP_SECONDS);
    expect(w.objects.find((o) => o.id === 999)).toBeUndefined();
    expect(ev.some((e) => e.type === "object-lost")).toBe(true);
  });

  it("empty fuel gives no thrust", () => {
    const w = createWorld(0); w.ship.fuelKg = 0; w.ship.throttleSetting = 1;
    expect(commandedThrust(w.ship, idle(), 0, 1).thrustN).toBe(0);
  });
});
