/**
 * Standing character avatar: the cut-out figure stands freely on the page
 * instead of being clipped by the round frame, and the owner can drag it
 * anywhere they like. The position is saved so it stays where they put it.
 */
import { useRef, useState } from "react";
import { Move } from "lucide-react";

export type StandingPosition = { x: number; y: number; scale: number };

export const DEFAULT_STANDING: StandingPosition = { x: 0, y: 0, scale: 1 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Props {
  src: string;
  alt: string;
  position: StandingPosition;
  /** Height of the standing figure in pixels at scale 1. */
  baseHeight?: number;
  /** Owners can drag; visitors just see it where the owner placed it. */
  editable?: boolean;
  onChange?: (next: StandingPosition) => void;
  onCommit?: (next: StandingPosition) => void;
}

const StandingAvatar = ({
  src,
  alt,
  position,
  baseHeight = 240,
  editable = false,
  onChange,
  onCommit,
}: Props) => {
  const [local, setLocal] = useState<StandingPosition | null>(null);
  const dragging = useRef<{ id: number; x: number; y: number } | null>(null);
  const pos = local ?? position;

  const move = (dx: number, dy: number) => {
    const next = { ...pos, x: clamp(pos.x + dx, -600, 600), y: clamp(pos.y + dy, -400, 400) };
    setLocal(next);
    onChange?.(next);
    return next;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editable) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragging.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d || d.id !== e.pointerId) return;
    dragging.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    move(e.clientX - d.x, e.clientY - d.y);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = null;
    onCommit?.(pos);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!editable) return;
    const step = e.shiftKey ? 20 : 5;
    let next: StandingPosition | null = null;
    if (e.key === "ArrowLeft") next = move(-step, 0);
    else if (e.key === "ArrowRight") next = move(step, 0);
    else if (e.key === "ArrowUp") next = move(0, -step);
    else if (e.key === "ArrowDown") next = move(0, step);
    if (!next) return;
    e.preventDefault();
    onCommit?.(next);
  };

  return (
    <div
      role={editable ? "application" : undefined}
      aria-label={editable ? `Drag ${alt} to move it` : undefined}
      tabIndex={editable ? 0 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={`group relative touch-none select-none outline-none ${
        editable ? "cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring" : ""
      }`}
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        height={Math.round(baseHeight * pos.scale)}
        style={{ height: baseHeight * pos.scale }}
        className="w-auto max-w-none object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
      />
      {editable && (
        <span className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-background/85 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Move className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      )}
    </div>
  );
};

export default StandingAvatar;
