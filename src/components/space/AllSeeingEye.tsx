import { setSpaceBgSettings, useSpaceBgSettings } from "@/lib/spaceBackgroundSettings";
import type { SpaceBgCamera, SpaceBgView } from "@/lib/spaceBackgroundSettings";

interface Vantage {
  label: string;
  view: SpaceBgView;
  camera: SpaceBgCamera;
}

/** Camera vantage points on the same universe, cycled in order. */
const VANTAGES: Vantage[] = [
  { label: "Wide galaxy view", view: "solar", camera: "galaxy" },
  { label: "Chase camera behind the ship", view: "solar", camera: "chase" },
  { label: "Planet orbit", view: "solar", camera: "orbit" },
  { label: "Mining world", view: "mining", camera: "chase" },
  { label: "Earth descent", view: "descent", camera: "galaxy" },
];

/**
 * All-seeing eye: a single outline icon in the top-right corner. Clicking it
 * cycles the camera vantage point on the space background. Nothing else.
 */
const AllSeeingEye = () => {
  const { view, camera } = useSpaceBgSettings();

  const index = Math.max(
    0,
    VANTAGES.findIndex((v) => v.view === view && (view !== "solar" || v.camera === camera)),
  );
  const next = VANTAGES[(index + 1) % VANTAGES.length];

  return (
    <button
      type="button"
      onClick={() => setSpaceBgSettings({ view: next.view, camera: next.camera })}
      title={`Viewpoint: ${VANTAGES[index].label} — click for ${next.label.toLowerCase()}`}
      aria-label={`Change camera viewpoint. Current: ${VANTAGES[index].label}`}
      className="fixed top-3 right-3 z-[60] p-2 text-foreground/70 hover:text-primary transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1.8 12S5.6 5.5 12 5.5 22.2 12 22.2 12 18.4 18.5 12 18.5 1.8 12 1.8 12Z" />
      </svg>
    </button>
  );
};

export default AllSeeingEye;
