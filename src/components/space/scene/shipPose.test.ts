import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ShipPose, MODEL_NOSE_FLIP } from "./shipPose";
import { clearanceFactor } from "./ShipChaseCamera";
import { MINING_SHIP_SCALE } from "./shipTelemetry";

/**
 * Regression cover for the rendered ship transform.
 * The old code slerped the *already corrected* quaternion toward an
 * uncorrected target and then applied another 180-degree yaw every frame,
 * so the hull alternated orientation even with a constant heading.
 */

const UP = new THREE.Vector3(0, 1, 0);

/** The faulty implementation, reproduced exactly, for the regression check. */
const buggySequence = (frames: number) => {
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, -1);
  const m = new THREE.Matrix4();
  const out: THREE.Quaternion[] = [];
  for (let i = 0; i < frames; i++) {
    m.lookAt(pos, pos.clone().add(forward), UP);
    const target = new THREE.Quaternion().setFromRotationMatrix(m);
    q.slerp(target, Math.min(1, (1 / 60) * 3));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
    out.push(q.clone());
  }
  return out;
};

const angleBetween = (a: THREE.Quaternion, b: THREE.Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(b))));

const run = (
  frames: number,
  opts: { dt?: () => number; forward?: (i: number) => THREE.Vector3; roll?: (i: number) => number; animate?: (i: number) => boolean } = {},
) => {
  const pose = new ShipPose();
  const pos = new THREE.Vector3();
  const deltas: number[] = [];
  let prevQ: THREE.Quaternion | null = null;
  for (let i = 0; i < frames; i++) {
    const dt = opts.dt ? opts.dt() : 1 / 60;
    const forward = (opts.forward?.(i) ?? new THREE.Vector3(0, 0, -1)).clone().normalize();
    const animate = opts.animate ? opts.animate(i) : true;
    if (animate) pos.addScaledVector(forward, 120 * dt);
    pose.update({ position: pos, forward, roll: opts.roll?.(i) ?? 0, dt, animate });
    if (prevQ) deltas.push(angleBetween(prevQ, pose.quaternion));
    prevQ = pose.quaternion.clone();
  }
  return { pose, deltas, maxDelta: Math.max(...deltas, 0) };
};

describe("ship render pose", () => {
  it("reproduces the old alternating-orientation glitch (guards the fix)", () => {
    const seq = buggySequence(30);
    let worst = 0;
    for (let i = 1; i < seq.length; i++) worst = Math.max(worst, angleBetween(seq[i - 1], seq[i]));
    // the faulty sequence swings by roughly half a turn every frame
    expect(worst).toBeGreaterThan(Math.PI / 2);
  });

  it("holds a steady pose under a constant heading", () => {
    const { maxDelta, deltas } = run(240);
    expect(maxDelta).toBeLessThan(0.02);
    // and settles rather than oscillating
    expect(deltas[deltas.length - 1]).toBeLessThan(1e-6);
  });

  it("noses the model's +Z along the flight direction", () => {
    const forward = new THREE.Vector3(0.4, 0.1, -0.9).normalize();
    const { pose } = run(600, { forward: () => forward });
    const nose = new THREE.Vector3(0, 0, 1).applyQuaternion(pose.quaternion);
    expect(nose.angleTo(forward)).toBeLessThan(0.02);
  });

  it("starts at a valid pose on the first frame instead of spinning from identity", () => {
    const pose = new ShipPose();
    const forward = new THREE.Vector3(1, 0, 0);
    pose.update({ position: new THREE.Vector3(10, 0, 0), forward, roll: 0, dt: 1 / 60, animate: true });
    const nose = new THREE.Vector3(0, 0, 1).applyQuaternion(pose.quaternion);
    expect(nose.angleTo(forward)).toBeLessThan(1e-6);
    expect(pose.velocity.length()).toBe(0); // no startup velocity spike
  });

  it("keeps successive changes bounded while turning, banking and at varied frame rates", () => {
    const { maxDelta } = run(900, {
      dt: () => 1 / 30 + Math.random() * 0.02,
      forward: (i) => new THREE.Vector3(Math.cos(i * 0.01), Math.sin(i * 0.004) * 0.3, Math.sin(i * 0.01)),
      roll: (i) => Math.sin(i * 0.02) * 0.6,
    });
    expect(maxDelta).toBeLessThan(0.35);
  });

  it("freezes while paused and resumes smoothly after a long inactive tab", () => {
    const pose = new ShipPose();
    const forward = new THREE.Vector3(0, 0, -1);
    const pos = new THREE.Vector3();
    for (let i = 0; i < 60; i++) pose.update({ position: pos, forward, roll: 0, dt: 1 / 60, animate: true });
    const frozen = pose.quaternion.clone();
    for (let i = 0; i < 30; i++) pose.update({ position: pos, forward, roll: 0, dt: 1 / 60, animate: false });
    expect(angleBetween(frozen, pose.quaternion)).toBe(0);
    expect(pose.velocity.length()).toBe(0);

    // resume with a clamped catch-up frame after the tab was hidden
    const turned = new THREE.Vector3(1, 0, 0);
    pose.update({ position: pos, forward: turned, roll: 0, dt: 0.05, animate: true });
    expect(angleBetween(frozen, pose.quaternion)).toBeLessThan(0.35);
  });

  it("applies the model-axis correction as a fixed part of the target", () => {
    const pose = new ShipPose();
    const out = new THREE.Quaternion();
    pose.poseFor(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0, out);
    expect(angleBetween(out, MODEL_NOSE_FLIP)).toBeLessThan(1e-6);
  });
});

describe("chase camera clearance", () => {
  it("keeps mining framing unchanged and scales clearance with a bigger hull", () => {
    expect(clearanceFactor(MINING_SHIP_SCALE)).toBe(1);
    expect(clearanceFactor(7.5)).toBeCloseTo(7.5 / MINING_SHIP_SCALE, 5);
    // a 7.5 hull trails far outside the craft rather than 26 units inside it
    expect(26 * clearanceFactor(7.5)).toBeGreaterThan(7.5 * 6);
    expect(clearanceFactor(0)).toBe(1); // never collapses on a missing value
  });
});
