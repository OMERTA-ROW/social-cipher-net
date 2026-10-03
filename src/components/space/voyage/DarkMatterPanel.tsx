import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createAnomalies,
  DARK_MATTER_LABEL,
  DARK_MATTER_TOOLTIP,
  readFieldSensors,
  type Position,
} from "@/lib/space/darkMatterSensors";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onScan: () => void;
  readShipPosition: () => Position | null;
  outerEnvelope: number;
};

export default function DarkMatterPanel({ enabled, onEnabledChange, onScan, readShipPosition, outerEnvelope }: Props) {
  const anomalies = useMemo(() => createAnomalies(outerEnvelope), [outerEnvelope]);
  const [reading, setReading] = useState(() => readFieldSensors(false, null, anomalies));

  useEffect(() => {
    if (!enabled) {
      setReading(readFieldSensors(false, null, anomalies));
      return;
    }
    const refresh = () => {
      if (!document.hidden) setReading(readFieldSensors(true, readShipPosition(), anomalies));
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [anomalies, enabled, readShipPosition]);

  return (
    <section aria-label="Exploration sensors" className="space-y-2 border-t border-border/60 pt-3 text-[11px]">
      <label className="flex items-center justify-between gap-2" title={DARK_MATTER_TOOLTIP}>
        <span>{DARK_MATTER_LABEL}</span>
        <Switch aria-describedby="dark-matter-help" checked={enabled} onCheckedChange={onEnabledChange} />
      </label>
      <p id="dark-matter-help" className="text-muted-foreground">{DARK_MATTER_TOOLTIP}</p>
      {enabled && (
        <div className="space-y-2 rounded border border-border/60 bg-background/60 p-2">
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
            <dt>Field</dt><dd className="text-right">On</dd>
            <dt>Local density</dt><dd className="text-right">{reading.density}</dd>
            <dt>Boundary</dt><dd className="text-right">{reading.inside ? `Inside ${reading.anomalyId ?? "zone"}` : reading.distance === null ? "Unavailable" : `${reading.distance.toFixed(1)} scene units`}</dd>
            <dt>Signal quality</dt><dd className="text-right">{reading.signalQualityPercent.toFixed(1)}%</dd>
            <dt>Sensor noise</dt><dd className="text-right">{reading.sensorNoisePercent.toFixed(1)}%</dd>
          </dl>
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={onScan}>Scan anomaly boundary</Button>
          <p className="text-muted-foreground">Sensor estimate only. Flight and gravity are unchanged.</p>
        </div>
      )}
      <details>
        <summary className="cursor-pointer py-1">Sun · NASA reference temperatures</summary>
        <p className="mt-1 text-muted-foreground">Photosphere ≈5,500°C · Core ≈15 million°C · Corona up to ≈2 million°C.</p>
        <p className="mt-1 text-muted-foreground">Layers: core, radiative zone, convection zone, photosphere, chromosphere, transition region, corona. Reference values, not live measurements.</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <a href="https://science.nasa.gov/sun/facts/" target="_blank" rel="noopener noreferrer" className="text-primary underline">NASA Sun facts</a>
          <a href="https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/" target="_blank" rel="noopener noreferrer" className="text-primary underline">NASA Sun layers</a>
          <a href="https://science.nasa.gov/dark-matter/" target="_blank" rel="noopener noreferrer" className="text-primary underline">NASA dark matter</a>
        </div>
      </details>
    </section>
  );
}