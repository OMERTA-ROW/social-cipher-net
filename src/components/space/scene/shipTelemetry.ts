import * as THREE from "three";

/**
 * Shared, frame-updated state for the mining vessel.
 * The vessel writes it, the chase camera and mining beats read it, so nothing
 * has to be threaded through React state at 60fps.
 */
export type MissionPhase =
  | "travel"
  | "approach"
  | "landing"
  | "docked"
  | "mining"
  | "conquest"
  | "combat"
  | "departure";

export const shipTelemetry = {
  position: new THREE.Vector3(0, 0, 0),
  quaternion: new THREE.Quaternion(),
  velocity: new THREE.Vector3(),
  /** 0..1 engine output, drives thruster glow and camera shake */
  throttle: 0.5,
  phase: "travel" as MissionPhase,
  /** 0..1 progress inside the current phase */
  phaseProgress: 0,
};

/** Ordered mission beats for the alien-world view, with durations in seconds. */
export const MISSION: { phase: MissionPhase; seconds: number; label: string }[] = [
  { phase: "travel", seconds: 22, label: "Transit to the ore world" },
  { phase: "approach", seconds: 14, label: "Orbital approach" },
  { phase: "landing", seconds: 12, label: "Descent and landing" },
  { phase: "docked", seconds: 10, label: "Docking clamps engaged" },
  { phase: "mining", seconds: 30, label: "Extracting ore" },
  { phase: "conquest", seconds: 16, label: "Securing the claim" },
  { phase: "combat", seconds: 18, label: "Defending the site" },
  { phase: "departure", seconds: 16, label: "Breaking orbit" },
];

export const MISSION_LENGTH = MISSION.reduce((n, m) => n + m.seconds, 0);

/** Resolve elapsed mission time into the active beat. */
export const missionAt = (time: number) => {
  let t = time % MISSION_LENGTH;
  for (let i = 0; i < MISSION.length; i++) {
    if (t < MISSION[i].seconds) {
      return { index: i, ...MISSION[i], progress: t / MISSION[i].seconds };
    }
    t -= MISSION[i].seconds;
  }
  const last = MISSION[MISSION.length - 1];
  return { index: MISSION.length - 1, ...last, progress: 1 };
};
