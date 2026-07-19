import zozoPortrait from "@/assets/zozo-alien-portrait.jpg";
import dracoPortrait from "@/assets/draco-alien-portrait.jpg";

interface AlienIconProps {
  className?: string;
  mode?: "zozo" | "draco";
}

export const AlienIcon = ({ className = "", mode }: AlienIconProps) => {
  // Infer mode from className if not explicitly set (backwards compat)
  const resolved: "zozo" | "draco" =
    mode ?? (className.includes("text-red") ? "draco" : "zozo");
  const src = resolved === "draco" ? dracoPortrait : zozoPortrait;
  const ring =
    resolved === "draco"
      ? "ring-red-500/70 shadow-[0_0_16px_rgba(239,68,68,0.7)]"
      : "ring-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.7)]";

  return (
    <span
      className={`inline-block overflow-hidden rounded-full ring-2 ${ring} ${className}`}
      aria-label={resolved === "draco" ? "Draco alien AI" : "Zozo alien AI"}
    >
      <img
        src={src}
        alt={resolved === "draco" ? "Draco alien portrait" : "Zozo alien portrait"}
        className="h-full w-full object-cover"
        loading="lazy"
        width={64}
        height={64}
        draggable={false}
      />
    </span>
  );
};
