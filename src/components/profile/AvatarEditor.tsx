/**
 * Non-destructive avatar crop editor.
 *
 * The original upload is never altered: we keep its URL and only store a
 * transform (zoom + offset) describing how it should be framed. A high
 * resolution square is rendered from that transform for display, so the
 * picture stays sharp and the person can come back and readjust at any time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, ZoomIn } from "lucide-react";

/** Framing of the original image inside the square avatar. */
export type AvatarTransform = { zoom: number; x: number; y: number };

export const DEFAULT_TRANSFORM: AvatarTransform = { zoom: 1, x: 0, y: 0 };

/** Rendered avatars are 512px so a 256px slot still has a 2x source. */
export const AVATAR_RENDER_SIZE = 512;

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const VIEWPORT = 320;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Load an image, allowing canvas export from our own storage origin. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image"));
    img.src = src;
  });
}

/** Geometry shared by the live preview and the exported canvas. */
function layout(img: { width: number; height: number }, t: AvatarTransform, size: number) {
  const base = Math.max(size / img.width, size / img.height);
  const w = img.width * base * t.zoom;
  const h = img.height * base * t.zoom;
  return { w, h, left: size / 2 - w / 2 + t.x * size, top: size / 2 - h / 2 + t.y * size };
}

/** Render the framed square at full resolution from the untouched original. */
export async function renderAvatar(src: string, t: AvatarTransform): Promise<Blob> {
  const img = await loadImage(src);
  const size = AVATAR_RENDER_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing is not supported in this browser");
  ctx.imageSmoothingQuality = "high";
  const { w, h, left, top } = layout(img, t, size);
  ctx.drawImage(img, left, top, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not save that image"))), "image/png"),
  );
}

interface Props {
  open: boolean;
  /** Full-resolution original; never modified. */
  src: string | null;
  initial: AvatarTransform;
  saving?: boolean;
  onCancel: () => void;
  onSave: (transform: AvatarTransform) => void;
}

const AvatarEditor = ({ open, src, initial, saving, onCancel, onSave }: Props) => {
  const [t, setT] = useState<AvatarTransform>(initial);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    setT(initial);
  }, [initial, open]);

  useEffect(() => {
    if (!open || !src) return;
    let alive = true;
    setError(null);
    setImg(null);
    loadImage(src)
      .then((i) => alive && setImg(i))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [open, src]);

  const nudge = useCallback((dx: number, dy: number) => {
    setT((prev) => ({
      ...prev,
      x: clamp(prev.x + dx / VIEWPORT, -1, 1),
      y: clamp(prev.y + dy / VIEWPORT, -1, 1),
    }));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers: pinch to zoom. One finger or mouse: drag to reposition.
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStart.current) pinchStart.current = { dist, zoom: t.zoom };
      const ratio = dist / (pinchStart.current.dist || dist);
      setT((p) => ({ ...p, zoom: clamp(pinchStart.current!.zoom * ratio, MIN_ZOOM, MAX_ZOOM) }));
      return;
    }
    pinchStart.current = null;
    nudge(e.clientX - prev.x, e.clientY - prev.y);
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    setT((p) => ({ ...p, zoom: clamp(p.zoom * Math.exp(-e.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM) }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 16 : 4;
    if (e.key === "ArrowLeft") nudge(-step, 0);
    else if (e.key === "ArrowRight") nudge(step, 0);
    else if (e.key === "ArrowUp") nudge(0, -step);
    else if (e.key === "ArrowDown") nudge(0, step);
    else return;
    e.preventDefault();
  };

  const geo = img ? layout(img, t, VIEWPORT) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Position your picture</DialogTitle>
          <DialogDescription>
            Drag to move it, scroll or pinch to zoom. Your original photo is kept, so you can come
            back and change this whenever you like.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              ref={boxRef}
              role="application"
              aria-label="Drag to reposition your picture"
              tabIndex={0}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onWheel={onWheel}
              onKeyDown={onKeyDown}
              className="relative touch-none overflow-hidden rounded-lg border border-border/60 bg-black/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
            >
              {img && geo ? (
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{ width: geo.w, height: geo.h, left: geo.left, top: geo.top }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {/* Circle guide: everything outside it is trimmed in framed mode. */}
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.55)_inset] [clip-path:circle(50%_at_50%_50%)]" />
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/70" />
            </div>

            <div className="flex w-full items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Slider
                value={[t.zoom]}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                onValueChange={([z]) => setT((p) => ({ ...p, zoom: z }))}
                aria-label="Zoom"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset position"
                onClick={() => setT(DEFAULT_TRANSFORM)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(t)} disabled={!img || !!saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save picture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarEditor;
