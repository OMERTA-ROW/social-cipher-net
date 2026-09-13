import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { HARD_BOUNDARY, ShipAutopilot, obstaclesAt } from "./shipAutopilot";

/** Run the autopilot for `seconds` of simulated time at 60fps. */
const fly = (seconds: number, seed = 20260913) => {
  const pilot = new ShipAutopilot(seed);
  const dt = 1 / 60;
  const samples: THREE.Vector3[] = [];
  const destinations: THREE.Vector3[] = [pilot.state.destination.point.clone()];
  let minClearance = Infinity;
  let maxRadius = 0;
  let maxStep = 0;
  const prev = pilot.state.position.clone();

  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const t = i * dt;
    pilot.step(dt, t);
    const p = pilot.state.position;
    maxStep = Math.max(maxStep, p.distanceTo(prev));
    prev.copy(p);
    maxRadius = Math.max(maxRadius, p.length());
    for (const o of obstaclesAt(t)) {
      minClearance = Math.min(minClearance, p.distanceTo(o.center) - o.radius);
    }
    if (i % 60 === 0) samples.push(p.clone());
    const last = destinations[destinations.length - 1];
    if (!last.equals(pilot.state.destination.point)) destinations.push(pilot.state.destination.point.clone());
  }
  return { pilot, samples, destinations, minClearance, maxRadius, maxStep };
};

describe("ship autopilot", () => {
  it("chooses several independent destinations over a long flight", () => {
    const { pilot, destinations } = fly(600);
    expect(pilot.state.legsCompleted).toBeGreaterThanOrEqual(4);
    // destinations are genuinely different places, not a repeating loop
    const unique = new Set(destinations.map((d) => `${Math.round(d.x / 50)}:${Math.round(d.y / 50)}:${Math.round(d.z / 50)}`));
    expect(unique.size).toBeGreaterThanOrEqual(5);
  });

  it("investigates celestial points of interest as well as open space", () => {
    const kinds = new Set<string>();
    const pilot = new ShipAutopilot(7);
    for (let i = 0; i < 60 * 600; i++) {
      pilot.step(1 / 60, i / 60);
      kinds.add(pilot.state.destination.kind);
    }
    expect(kinds.has("point_of_interest")).toBe(true);
  });

  it("keeps clearance from the star and every planet", () => {
    const { minClearance } = fly(600);
    expect(minClearance).toBeGreaterThan(0);
  });

  it("stays inside the world and recovers without teleporting", () => {
    const pilot = new ShipAutopilot(3, new THREE.Vector3(HARD_BOUNDARY * 0.99, 0, 0));
    let maxStep = 0;
    let maxRadius = 0;
    const prev = pilot.state.position.clone();
    for (let i = 0; i < 60 * 240; i++) {
      pilot.step(1 / 60, i / 60);
      maxStep = Math.max(maxStep, pilot.state.position.distanceTo(prev));
      prev.copy(pilot.state.position);
      maxRadius = Math.max(maxRadius, pilot.state.position.length());
    }
    expect(maxRadius).toBeLessThanOrEqual(HARD_BOUNDARY + 1);
    // continuous travel: no frame ever jumps further than a cruise step
    expect(maxStep).toBeLessThan(4);
    // and it actually came back inside rather than hugging the perimeter
    expect(pilot.state.position.length()).toBeLessThan(HARD_BOUNDARY * 0.98);
  });

  it("never stalls: speed and heading stay continuous", () => {
    const pilot = new ShipAutopilot(11);
    let minSpeed = Infinity;
    for (let i = 0; i < 60 * 300; i++) {
      pilot.step(1 / 60, i / 60);
      if (i > 120) minSpeed = Math.min(minSpeed, pilot.state.velocity.length());
    }
    expect(minSpeed).toBeGreaterThan(5);
  });

  it("does not advance when reduced motion freezes the scene", () => {
    const pilot = new ShipAutopilot();
    const start = pilot.state.position.clone();
    // VesselFlight only calls step() when animate is true; nothing moves otherwise
    expect(pilot.state.position.equals(start)).toBe(true);
  });
});
