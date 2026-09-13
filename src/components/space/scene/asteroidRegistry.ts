import * as THREE from "three";

/**
 * Frame-updated list of the larger nearby asteroids.
 * AsteroidField writes it; the ship autopilot reads it so it can ease around
 * rocks in its path. Fixed-size pool — no allocation per frame.
 */
const MAX = 48;

export const asteroidRegistry = {
  centers: Array.from({ length: MAX }, () => new THREE.Vector3()),
  radii: new Float32Array(MAX),
  count: 0,
};
