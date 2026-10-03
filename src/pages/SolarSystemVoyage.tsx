import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AudioLines, ChevronDown, ChevronUp, CirclePause, CirclePlay, Crosshair, Gauge, Home, LocateFixed, Minus, Orbit, Plus, Rocket, RotateCcw, Satellite, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import VoyageScene, { QUALITY_BUDGETS, type CameraCommand, type FollowMode, type QualityTier, type TimeScale, type VoyageInput, type VoyageTelemetry } from "@/components/space/voyage/VoyageScene";
import VoyageErrorBoundary from "@/components/space/voyage/VoyageErrorBoundary";
import ProceduralStarFallback from "@/components/space/voyage/ProceduralStarFallback";
import { CELESTIAL_BODIES, SAFE_CONTACT_KMS, STATION, createShip, createWorld, launchProbe, type Impact, type StepEvent, type WorldState } from "@/lib/space/voyagePhysics";
import { prefersReducedMotion } from "@/lib/spaceBackgroundSettings";
import { VOYAGE_PREFS_KEY, parseVoyagePreferences, shouldIgnoreKey, supportsWebGL, type QualityPref } from "@/lib/space/voyagePreferences";
import { getTextureLoadStats, subscribeTextureLoadStats, type TextureLoadStats } from "@/components/space/realTextures";

const readPrefs = () => { try { return parseVoyagePreferences(localStorage.getItem(VOYAGE_PREFS_KEY)); } catch { return parseVoyagePreferences(null); } };
const fmtKm = (km: number) => km >= 1e6 ? `${(km / 1e6).toFixed(2)} M km` : `${Math.round(km).toLocaleString()} km`;
const fmtTime = (s: number) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`; };

function MiniMap({ t, selected }: { t: VoyageTelemetry | null; selected: string }) {
  const R = 20; // scene units covered (Neptune ≈ 18)
  const to = (x: number) => 50 + (x / R) * 48;
  return <svg viewBox="0 0 100 100" className="h-28 w-full rounded border border-border bg-background/80" role="img" aria-label="Solar system minimap: live positions of planets and ship">
    <circle cx="50" cy="50" r="2.4" className="fill-secondary" />
    {t?.planets.map(p => <circle key={p.id} cx={to(p.x)} cy={to(p.z)} r={p.id === selected ? 2 : 1.2} className={p.id === selected ? "fill-primary" : "fill-muted-foreground"}><title>{CELESTIAL_BODIES.find(b => b.id === p.id)?.name}</title></circle>)}
    {t && <rect x={to(t.ship.x) - 1.6} y={to(t.ship.z) - 1.6} width="3.2" height="3.2" transform={`rotate(45 ${to(t.ship.x)} ${to(t.ship.z)})`} className="fill-background stroke-primary" strokeWidth="0.8"><title>Ship</title></rect>}
  </svg>;
}

type HoldKey = "x" | "y" | "z" | "brake";
const SolarSystemVoyage = () => {
  const [prefs, setPrefs] = useState(readPrefs); const [reduced, setReduced] = useState(prefersReducedMotion);
  const [paused, setPaused] = useState(() => prefersReducedMotion()); const [selected, setSelectedState] = useState(prefs.selected);
  const [telemetry, setTelemetry] = useState<VoyageTelemetry | null>(null); const [impact, setImpact] = useState<Impact | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [resetCamera, setResetCamera] = useState(0); const [hidden, setHidden] = useState(() => document.hidden); const [firstFrame, setFirstFrame] = useState(false);
  const [webgl, setWebgl] = useState(supportsWebGL); const [contextLost, setContextLost] = useState(false); const [canvasKey, setCanvasKey] = useState(0); const lossCount = useRef(0);
  const [tex, setTex] = useState<TextureLoadStats>(getTextureLoadStats); const [autoTier, setAutoTier] = useState<QualityTier>("medium"); const fpsHistory = useRef<number[]>([]);
  const [audioOn, setAudioOn] = useState(false); const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 640); const [assist, setAssist] = useState(false);
  const worldRef = useRef<WorldState>(createWorld(0));
  const inputRef = useRef<VoyageInput>({ x: 0, y: 0, z: 0, brake: false, orbitAssist: false, dock: false, thrustScale: prefs.thrustScale });
  const cameraCmdRef = useRef<CameraCommand>({ rotateX: 0, rotateY: 0, zoom: 0 });
  const audioRef = useRef<{ ctx: AudioContext; hum: OscillatorNode; gain: GainNode } | null>(null);
  const quality: QualityTier = prefs.quality === "auto" ? autoTier : prefs.quality;
  const body = CELESTIAL_BODIES.find(b => b.id === selected) ?? CELESTIAL_BODIES[2];
  const setSelected = useCallback((id: string) => { setSelectedState(id); setPrefs(p => ({ ...p, selected: id })); }, []);

  useEffect(() => { try { localStorage.setItem(VOYAGE_PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } inputRef.current.thrustScale = prefs.thrustScale; }, [prefs]);
  useEffect(() => subscribeTextureLoadStats(setTex), []);
  useEffect(() => {
    const vis = () => setHidden(document.hidden); const mq = window.matchMedia("(prefers-reduced-motion: reduce)"); const mc = () => { setReduced(mq.matches); if (mq.matches) setPaused(true); };
    document.addEventListener("visibilitychange", vis); mq.addEventListener("change", mc);
    return () => { document.removeEventListener("visibilitychange", vis); mq.removeEventListener("change", mc); };
  }, []);

  // Keyboard: held thrust keys + one-shot commands. Cleared on blur/hidden so keys never stick.
  const held = useRef(new Set<string>()); const keyHeld = useRef<Record<HoldKey, number>>({ x: 0, y: 0, z: 0, brake: 0 }); const touchHeld = useRef<Record<HoldKey, number>>({ x: 0, y: 0, z: 0, brake: 0 });
  const syncInput = useCallback(() => { const i = inputRef.current; for (const k of ["x", "y", "z"] as const) i[k] = Math.max(-1, Math.min(1, keyHeld.current[k] + touchHeld.current[k])); i.brake = keyHeld.current.brake + touchHeld.current.brake > 0; }, []);
  const clearKeys = useCallback(() => { held.current.clear(); keyHeld.current = { x: 0, y: 0, z: 0, brake: 0 }; touchHeld.current = { x: 0, y: 0, z: 0, brake: 0 }; cameraCmdRef.current = { rotateX: 0, rotateY: 0, zoom: 0 }; syncInput(); }, [syncInput]);
  useEffect(() => { if (hidden) clearKeys(); }, [hidden, clearKeys]);
  const doLaunch = useCallback(() => { const ok = launchProbe(worldRef.current, QUALITY_BUDGETS[quality].maxObjects); setNotice(ok ? `Probe launched (${worldRef.current.ship.probes} left)` : worldRef.current.ship.probes <= 0 ? "No probes remaining" : "Probe launch unavailable in this state"); }, [quality]);
  const doDock = useCallback(() => { inputRef.current.dock = true; }, []);
  const toggleAssist = useCallback(() => setAssist(a => { inputRef.current.orbitAssist = !a; return !a; }), []);
  const resetShip = useCallback(() => { worldRef.current.ship = createShip(worldRef.current.time); setImpact(null); setNotice("Ship recovered to Earth orbit"); }, []);
  useEffect(() => {
    const thrustKeys: Record<string, [HoldKey, number]> = { KeyW: ["z", 1], KeyS: ["z", -1], KeyA: ["x", -1], KeyD: ["x", 1], KeyR: ["y", 1], KeyF: ["y", -1], Space: ["brake", 1] };
    const recompute = () => { const k: Record<HoldKey, number> = { x: 0, y: 0, z: 0, brake: 0 }; held.current.forEach(c => { const m = thrustKeys[c]; if (m) k[m[0]] += m[1]; }); keyHeld.current = k; syncInput(); };
    const down = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || shouldIgnoreKey(e.target, e.code)) return;
      if (thrustKeys[e.code]) { e.preventDefault(); held.current.add(e.code); recompute(); return; }
      if (e.repeat) return;
      const actions: Record<string, () => void> = { KeyP: () => setPaused(p => !p), Digit1: () => setPrefs(p => ({ ...p, timeScale: 1 })), Digit2: () => setPrefs(p => ({ ...p, timeScale: 10 })), Digit3: () => setPrefs(p => ({ ...p, timeScale: 100 })), KeyO: toggleAssist, KeyL: doLaunch, KeyK: doDock, KeyC: () => setResetCamera(v => v + 1), KeyG: () => setPrefs(p => ({ ...p, guides: !p.guides })), KeyN: () => setPrefs(p => ({ ...p, labels: !p.labels })) };
      if (actions[e.code]) { e.preventDefault(); actions[e.code](); }
    };
    const up = (e: KeyboardEvent) => { held.current.delete(e.code); recompute(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clearKeys);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clearKeys); };
  }, [syncInput, clearKeys, toggleAssist, doLaunch, doDock]);

  // Audio: created/resumed inside the toggle's user gesture; closed on unmount.
  const tone = (ctx: AudioContext, freq: number, dur: number, vol = 0.07) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.02); };
  const toggleAudio = () => {
    if (audioOn) { void audioRef.current?.ctx.suspend(); setAudioOn(false); return; }
    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!Ctor) { setNotice("Audio is not supported in this browser"); return; }
    if (!audioRef.current) { const ctx = new Ctor(); const hum = ctx.createOscillator(); const gain = ctx.createGain(); hum.type = "sawtooth"; hum.frequency.value = 55; gain.gain.value = 0; hum.connect(gain).connect(ctx.destination); hum.start(); audioRef.current = { ctx, hum, gain }; }
    void audioRef.current.ctx.resume().then(() => { if (audioRef.current) tone(audioRef.current.ctx, 660, 0.15); }); setAudioOn(true);
  };
  useEffect(() => () => { void audioRef.current?.ctx.close(); audioRef.current = null; }, []);
  useEffect(() => { const a = audioRef.current; if (!a || !audioOn || !telemetry) return; a.gain.gain.setTargetAtTime(telemetry.throttle * 0.03, a.ctx.currentTime, 0.1); a.hum.frequency.setTargetAtTime(50 + telemetry.throttle * 40, a.ctx.currentTime, 0.1); }, [telemetry, audioOn]);
  useEffect(() => { if (hidden) void audioRef.current?.ctx.suspend(); else if (audioOn) void audioRef.current?.ctx.resume(); }, [hidden, audioOn]);

  const onEvents = useCallback((events: StepEvent[]) => {
    for (const e of events) {
      if (e.type === "impact") { setImpact(e.impact); if (audioOn && audioRef.current) tone(audioRef.current.ctx, e.impact.severity === "major" ? 90 : 240, e.impact.severity === "major" ? 0.6 : 0.25, 0.1); if (!e.impact.destroyed) window.setTimeout(() => setImpact(cur => (cur === e.impact ? null : cur)), 3200); }
      else setNotice(e.label);
    }
  }, [audioOn]);
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(null), 3500); return () => window.clearTimeout(id); }, [notice]);
  // Auto quality: 2 s FPS windows with hysteresis; bounded to the three budget tiers.
  const onFps = useCallback((fps: number) => {
    if (prefs.quality !== "auto") return; const h = fpsHistory.current; h.push(fps); if (h.length > 3) h.shift();
    setAutoTier(tier => { if (fps < 28) { h.length = 0; return tier === "high" ? "medium" : "low"; } if (h.length === 3 && h.every(f => f > 55)) { h.length = 0; return tier === "low" ? "medium" : "high"; } return tier; });
  }, [prefs.quality]);

  const hold = (key: HoldKey, value: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); touchHeld.current[key] = value; syncInput(); },
    onPointerUp: () => { touchHeld.current[key] = 0; syncInput(); }, onPointerCancel: () => { touchHeld.current[key] = 0; syncInput(); }, onLostPointerCapture: () => { touchHeld.current[key] = 0; syncInput(); },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const cam = (key: keyof CameraCommand, value: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); cameraCmdRef.current[key] = value; },
    onPointerUp: () => { cameraCmdRef.current[key] = 0; }, onPointerCancel: () => { cameraCmdRef.current[key] = 0; }, onLostPointerCapture: () => { cameraCmdRef.current[key] = 0; },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cameraCmdRef.current[key] = value; } },
    onKeyUp: () => { cameraCmdRef.current[key] = 0; }, onBlur: () => { cameraCmdRef.current[key] = 0; },
  });

  const effectiveScale = paused ? 0 : prefs.timeScale;
  const texPending = tex.requested - tex.loaded - tex.failed;
  const status = telemetry?.status ?? "flying";
  const restore = () => { setContextLost(false); setFirstFrame(false); setCanvasKey(k => k + 1); };

  return <main className="fixed inset-0 overflow-hidden bg-background text-foreground" style={{ touchAction: "none" }}>
    <div className="absolute inset-0 z-0">
      <VoyageErrorBoundary fallback={<ProceduralStarFallback calm={reduced} />}>
        {webgl ? <Canvas key={canvasKey} frameloop={hidden ? "never" : "always"} dpr={[1, QUALITY_BUDGETS[quality].dpr]} camera={{ position: [0, 7, 18], fov: 55, near: 0.005, far: 2000 }}
          gl={{ antialias: quality !== "low", alpha: false, powerPreference: quality === "low" ? "low-power" : "high-performance", logarithmicDepthBuffer: true }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 1); gl.domElement.setAttribute("aria-label", "3D solar system view: drag to orbit, scroll or pinch to zoom"); gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); lossCount.current++; setContextLost(true); }); gl.domElement.addEventListener("webglcontextrestored", () => restore()); }}>
          <Suspense fallback={null}>
            <VoyageScene worldRef={worldRef} inputRef={inputRef} cameraCmdRef={cameraCmdRef} timeScale={effectiveScale} quality={quality} labels={prefs.labels} guides={prefs.guides} showVelocity={prefs.velocity} reducedMotion={reduced} selected={selected} follow={prefs.follow} resetCamera={resetCamera} onSelect={setSelected} onTelemetry={setTelemetry} onEvents={onEvents} onFirstFrame={() => setFirstFrame(true)} onFps={onFps} />
          </Suspense>
        </Canvas> : <ProceduralStarFallback calm={reduced} />}
      </VoyageErrorBoundary>
    </div>
    {!webgl && <div role="status" className="absolute inset-x-4 top-1/3 z-30 mx-auto max-w-md border border-border bg-background/90 p-4 text-center text-sm">3D graphics are unavailable on this device, so a 2D star view is shown. Flight simulation needs WebGL.</div>}
    {webgl && !firstFrame && !contextLost && <div role="status" aria-live="polite" className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-background/70"><div className="w-64 text-center"><p className="mb-2 text-sm text-muted-foreground">Preparing flight systems…</p><div className="h-1 w-full overflow-hidden rounded bg-muted"><div className="h-full w-1/3 animate-pulse rounded bg-primary" /></div></div></div>}
    {webgl && firstFrame && texPending > 0 && <div role="status" className="pointer-events-none absolute left-1/2 top-3 z-30 w-48 -translate-x-1/2 border border-border bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground">Textures {tex.loaded}/{tex.requested}<Progress className="mt-1 h-1" value={(tex.loaded / Math.max(1, tex.requested)) * 100} /></div>}
    {contextLost && <div role="alert" className="absolute inset-0 z-40 grid place-items-center bg-background/85"><div className="max-w-sm border border-destructive/50 bg-background p-4 text-center"><p className="text-sm">The graphics context was lost (often from GPU memory pressure).</p><div className="mt-3 flex justify-center gap-2"><Button size="sm" onClick={restore}>Restore 3D</Button>{lossCount.current >= 2 && <Button size="sm" variant="outline" onClick={() => { setContextLost(false); setWebgl(false); }}>Use 2D view</Button>}</div></div></div>}

    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-4">
      <div className="pointer-events-auto max-w-[55%]">
        <div className="flex gap-1"><Button variant="ghost" size="sm" asChild className="bg-background/80"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Home</Link></Button><Button size="sm" variant="ghost" asChild className="hidden bg-background/80 sm:inline-flex"><Link to="/backgrounds">Backgrounds</Link></Button></div>
        <h1 className="mt-1 text-base font-semibold sm:text-2xl">Solar System Voyage</h1>
        <p className="text-[10px] text-muted-foreground sm:text-xs">Scale optimized for exploration; relative planetary data preserved.</p>
        {telemetry && <p className="font-mono text-[10px] text-muted-foreground">T+{fmtTime(telemetry.simTime)}</p>}
      </div>
      <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
        <Button size="sm" variant="outline" onClick={() => setPaused(p => !p)} aria-pressed={paused}>{paused ? <CirclePlay className="mr-1 h-4 w-4" /> : <CirclePause className="mr-1 h-4 w-4" />}{paused ? "Resume" : "Pause"}</Button>
        {([1, 10, 100] as TimeScale[]).map(s => <Button key={s} size="sm" variant={prefs.timeScale === s ? "default" : "outline"} aria-pressed={prefs.timeScale === s} onClick={() => setPrefs(p => ({ ...p, timeScale: s }))}>{s}×</Button>)}
        <Button size="sm" variant="outline" className="sm:hidden" aria-expanded={panelOpen} aria-controls="voyage-panel" onClick={() => setPanelOpen(o => !o)}>{panelOpen ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}Details</Button>
      </div>
    </header>

    {panelOpen && <aside id="voyage-panel" aria-label="Flight details and settings" style={{ touchAction: "pan-y" }} className="pointer-events-auto absolute inset-x-2 top-[7.5rem] z-30 max-h-[calc(100dvh-20rem)] overflow-y-auto border border-border bg-background/92 p-3 backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:top-24 sm:max-h-[calc(100dvh-17rem)] sm:w-72">
      <label className="text-[10px] uppercase text-muted-foreground" htmlFor="body-select">Selected body</label>
      <Select value={selected} onValueChange={setSelected}><SelectTrigger id="body-select" className="mt-1 h-9"><SelectValue /></SelectTrigger><SelectContent>{CELESTIAL_BODIES.map(b => <SelectItem value={b.id} key={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Diameter</dt><dd className="text-right">{(body.radiusKm * 2).toLocaleString()} km</dd>
        <dt className="text-muted-foreground">Mass</dt><dd className="text-right">{body.massKg.toExponential(3)} kg</dd>
        <dt className="text-muted-foreground">Surface gravity</dt><dd className="text-right">{body.surfaceGravity} m/s²</dd>
        <dt className="text-muted-foreground">Orbit period</dt><dd className="text-right">{body.periodDays.toLocaleString()} d</dd>
        <dt className="text-muted-foreground">Real orbit radius</dt><dd className="text-right">{(body.semiMajorKm / 1e6).toFixed(1)} M km</dd>
        <dt className="text-muted-foreground">Ship distance (real)</dt><dd className="text-right">{telemetry ? fmtKm(telemetry.selectedRealDistanceKm) : "—"}</dd>
        <dt className="text-muted-foreground">Ship distance (scaled)</dt><dd className="text-right">{telemetry ? `${telemetry.selectedRenderDistance.toFixed(2)} u` : "—"}</dd>
      </dl>
      <a href={body.source} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] text-primary underline">NASA source data</a>
      <div className="my-3 border-t border-border" /><MiniMap t={telemetry} selected={selected} />
      <p className="mt-2 text-[10px] uppercase text-muted-foreground">Nearby objects</p>
      <ul className="font-mono text-[11px]">{telemetry?.nearby.map(n => <li key={n.id} className="flex justify-between"><span>{n.name}</span><span>{fmtKm(n.distanceKm)}</span></li>)}</ul>
      <div className="my-3 border-t border-border" />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        <dt className="text-muted-foreground">Status</dt><dd className="text-right capitalize">{status}{telemetry?.contactLabel && status !== "flying" && status !== "destroyed" ? ` · ${telemetry.contactLabel}` : ""}</dd>
        <dt className="text-muted-foreground">Speed rel. {telemetry?.reference ?? ""}</dt><dd className="text-right">{telemetry ? `${telemetry.speedRel.toFixed(3)} km/s` : "—"}</dd>
        <dt className="text-muted-foreground">Heliocentric speed</dt><dd className="text-right">{telemetry ? `${telemetry.speedAbs.toFixed(2)} km/s` : "—"}</dd>
        <dt className="text-muted-foreground">Altitude ({telemetry?.closest ?? "—"})</dt><dd className="text-right">{telemetry ? fmtKm(telemetry.altitude) : "—"}</dd>
        <dt className="text-muted-foreground">Gravity</dt><dd className="text-right">{telemetry ? `${(telemetry.gravity * 1000).toFixed(3)} m/s²` : "—"}</dd>
        <dt className="text-muted-foreground">Fuel</dt><dd className="text-right">{telemetry ? `${telemetry.fuel.toFixed(0)} kg` : "—"}</dd>
        <dt className="text-muted-foreground">Probes</dt><dd className="text-right">{telemetry?.probes ?? "—"}</dd>
        <dt className="text-muted-foreground">Station port</dt><dd className="text-right">{telemetry ? `${fmtKm(telemetry.dockDistanceKm)} · ${(telemetry.dockRelSpeed * 1000).toFixed(0)} m/s` : "—"}</dd>
      </dl>
      <p className="mt-1 text-[10px] text-muted-foreground">Dock within {STATION.dockingZoneKm} km of the station below {SAFE_CONTACT_KMS * 1000} m/s; land only on the green zones (Earth, Mars).</p>
      <p className="mt-2 text-[10px] uppercase text-muted-foreground">Damage {telemetry ? Math.round(telemetry.damage) : 0}%</p><Progress className="mt-1 h-2" value={telemetry?.damage ?? 0} aria-label="Ship damage" />
      <div className="my-3 border-t border-border" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {([["Orbit guides", "guides"], ["Labels", "labels"], ["Velocity vector", "velocity"]] as const).map(([label, key]) => <label key={key} className="flex items-center justify-between gap-2">{label}<Switch checked={prefs[key]} onCheckedChange={v => setPrefs(p => ({ ...p, [key]: v }))} /></label>)}
        <label className="flex items-center justify-between gap-2">Sound<Switch checked={audioOn} onCheckedChange={toggleAudio} aria-label="Sound" /></label>
        <label className="col-span-2 flex items-center justify-between gap-2">Quality<Select value={prefs.quality} onValueChange={(v: QualityPref) => setPrefs(p => ({ ...p, quality: v }))}><SelectTrigger className="h-8 w-36" aria-label="Quality"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto ({autoTier})</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></label>
        <label className="col-span-2 flex items-center justify-between gap-2">Camera<Select value={prefs.follow} onValueChange={(v: FollowMode) => setPrefs(p => ({ ...p, follow: v }))}><SelectTrigger className="h-8 w-36" aria-label="Camera follow"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="selected">Follow selection</SelectItem><SelectItem value="ship">Follow ship</SelectItem></SelectContent></Select></label>
        <div className="col-span-2"><span className="text-muted-foreground">Thrust power {Math.round(prefs.thrustScale * 100)}%</span><Slider className="mt-2" min={25} max={100} step={5} value={[prefs.thrustScale * 100]} onValueChange={([v]) => setPrefs(p => ({ ...p, thrustScale: v / 100 }))} aria-label="Thrust power" /></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" onClick={() => setResetCamera(v => v + 1)}><LocateFixed className="mr-1 h-3.5 w-3.5" />Reset Camera</Button>
        <Button size="sm" variant="outline" onClick={resetShip}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset Ship</Button>
        <Button size="sm" variant="outline" onClick={toggleAudio}>{audioOn ? <AudioLines className="mr-1 h-3.5 w-3.5" /> : <VolumeX className="mr-1 h-3.5 w-3.5" />}{audioOn ? "Sound on" : "Sound off"}</Button>
        <Button size="sm" variant="outline" asChild className="sm:hidden"><Link to="/backgrounds">Backgrounds</Link></Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Keys: W/S prograde/retrograde · A/D lateral · R/F radial · Space brake · O orbit assist · L probe · K dock · P pause · 1/2/3 speed · C camera · G guides · N labels</p>
    </aside>}

    {/* Bottom control deck: flight (left) and camera (right). Never overlaps the details panel. */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-2 sm:p-4">
      <div className="pointer-events-auto select-none" style={{ touchAction: "none" }}>
        <div className="mb-1 grid grid-cols-4 gap-1">
          <Button size="sm" variant={assist ? "default" : "outline"} aria-pressed={assist} onClick={toggleAssist} className="h-9 bg-background/80 px-2 text-[11px]"><Orbit className="mr-1 h-3.5 w-3.5" />Assist</Button>
          <Button size="sm" variant="outline" onClick={doLaunch} disabled={status !== "flying"} className="h-9 bg-background/80 px-2 text-[11px]"><Rocket className="mr-1 h-3.5 w-3.5" />Probe</Button>
          <Button size="sm" variant="outline" onClick={doDock} disabled={status === "destroyed" || status === "landed"} className="h-9 bg-background/80 px-2 text-[11px]"><Satellite className="mr-1 h-3.5 w-3.5" />{status === "docked" ? "Undock" : "Dock"}</Button>
          <Button size="sm" variant="destructive" aria-label="Brake (hold)" {...hold("brake", 1)} className="h-9 bg-background/80 px-2 text-[11px]">Brake</Button>
        </div>
        <div className="grid w-44 grid-cols-3 gap-1 sm:w-48" aria-label="Thrust pad (hold buttons; multiple at once)">
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Radial out thrust (R)" {...hold("y", 1)} >R</Button>
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Prograde thrust (W)" {...hold("z", 1)} >W</Button>
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Radial in thrust (F)" {...hold("y", -1)} >F</Button>
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Lateral left thrust (A)" {...hold("x", -1)} >A</Button>
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Retrograde thrust (S)" {...hold("z", -1)} >S</Button>
          <Button variant="outline" className="h-11 bg-background/80" aria-label="Lateral right thrust (D)" {...hold("x", 1)} >D</Button>
        </div>
      </div>
      <div className="pointer-events-auto grid select-none grid-cols-3 gap-1" style={{ touchAction: "none" }} aria-label="Camera controls">
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Zoom in" {...cam("zoom", -1)}><Plus className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Orbit camera up" {...cam("rotateY", 1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Zoom out" {...cam("zoom", 1)}><Minus className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Orbit camera left" {...cam("rotateX", -1)}><ArrowLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Orbit camera down" {...cam("rotateY", -1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Orbit camera right" {...cam("rotateX", 1)}><ArrowRight className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="bg-background/80" aria-label="Recenter camera" onClick={() => setResetCamera(v => v + 1)}><Crosshair className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" asChild title="Home"><Link to="/" aria-label="Home"><Home className="h-4 w-4" /></Link></Button>
      </div>
    </div>

    {impact && <div role="alert" className={`absolute bottom-48 left-1/2 z-40 w-[min(22rem,calc(100vw-1rem))] -translate-x-1/2 border px-4 py-3 text-sm backdrop-blur ${impact.severity === "major" ? "border-destructive bg-destructive/20" : "border-primary bg-background/90"}`}>
      <Gauge className="mr-2 inline h-4 w-4" />{impact.destroyed ? "Ship destroyed — propulsion offline" : impact.severity === "major" ? "Major impact" : "Scrape / minor collision"} · {(impact.speedKmS * 1000).toFixed(0)} m/s vs {impact.bodyId}
      {(impact.destroyed || impact.severity === "major") && <Button className="ml-3" size="sm" onClick={resetShip}>Recover ship</Button>}
    </div>}
    {notice && <div role="status" aria-live="polite" className="absolute bottom-48 left-1/2 z-40 -translate-x-1/2 translate-y-14 border border-border bg-background/90 px-3 py-1.5 text-xs">{notice}</div>}
  </main>;
};
export default SolarSystemVoyage;
