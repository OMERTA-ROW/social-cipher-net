/**
 * Destination registry — every named place in the multiverse.
 *
 * Stage 1 only ships Earth, but later stages (megaships, portals, alien
 * worlds) register here so travel, docking and the LOD manager have one
 * source of truth for where things are and who renders them.
 */

import { PLANET_RADIUS } from "./altitude";

export type DestinationKind = "planet" | "station" | "megaship" | "portal";

export interface Destination {
  id: string;
  label: string;
  kind: DestinationKind;
  /** world-space centre */
  position: [number, number, number];
  /** surface radius (planets) or hull half-extent (ships/stations) */
  radius: number;
  /** module that owns the surface / interior content, if any */
  surfaceModule?: string;
  /** true when the camera can descend continuously onto it */
  descendable: boolean;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "earth",
    label: "Earth — Neon Sprawl",
    kind: "planet",
    position: [0, 0, 0],
    radius: PLANET_RADIUS,
    surfaceModule: "cyberpunk-city",
    descendable: true,
  },
];

export const getDestination = (id: string) =>
  DESTINATIONS.find((d) => d.id === id);

export const defaultDestination = () => DESTINATIONS[0];
