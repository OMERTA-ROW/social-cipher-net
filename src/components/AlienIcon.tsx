import zozoPortrait from "@/assets/zozo-alien-portrait.jpg";
import dracoPortrait from "@/assets/draco-alien-portrait.jpg";

interface AlienIconProps {
  className?: string;
  mode?: "zozo" | "draco";
  tabIndex?: number;
}

export const AlienIcon = ({ className = "", mode, tabIndex = -1 }: AlienIconProps) => {
  // Infer mode from className if not explicitly set (backwards compat)
  const resolved: "zozo" | "draco" =
    mode ?? (className.includes("text-red") ? "draco" : "zozo");
  const src = resolved === "draco" ? dracoPortrait : zozoPortrait;
  const ring =
    resolved === "draco"
      ? "ring-red-500/70 shadow-[0_0_16px_rgba(239,68,68,0.7)]"
      : "ring-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.7)]";

  const hoverGlow =
    resolved === "draco"
      ? "hover:ring-red-400 hover:shadow-[0_0_28px_rgba(239,68,68,0.95)]"
      : "hover:ring-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.95)]";

  const focusGlow =
    resolved === "draco"
      ? "focus-visible:ring-red-400 focus-visible:shadow-[0_0_28px_rgba(239,68,68,0.95)]"
      : "focus-visible:ring-cyan-300 focus-visible:shadow-[0_0_28px_rgba(34,211,238,0.95)]";

  return (
    <span
      tabIndex={tabIndex}
      className={`group relative inline-block overflow-hidden rounded-full ring-2 ${ring} ${hoverGlow} ${focusGlow} ${className} animate-[alien-breathe_3.6s_ease-in-out_infinite] transition-all duration-300 hover:scale-110 hover:animate-none cursor-pointer focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      aria-label={resolved === "draco" ? "Draco alien AI" : "Zozo alien AI"}
    >
      <img
        src={src}
        alt={resolved === "draco" ? "Draco alien portrait" : "Zozo alien portrait"}
        className="h-full w-full object-cover animate-[alien-sway_6s_ease-in-out_infinite] transition-transform duration-500 group-hover:scale-110 group-hover:animate-[alien-alert_1.2s_ease-in-out_infinite]"
        loading="lazy"
        width={64}
        height={64}
        draggable={false}
      />
      {/* Hover scanline sweep */}
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] bg-[length:200%_100%] animate-[alien-scan_1.4s_linear_infinite]" />
      <style>{`
        @keyframes alien-breathe{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.04);filter:brightness(1.15)}}
        @keyframes alien-sway{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.5%,-1%)}50%{transform:translate(1%,1.5%)}75%{transform:translate(1.5%,-0.5%)}}
        @keyframes alien-alert{0%,100%{transform:scale(1.05);filter:brightness(1.2) saturate(1.2)}50%{transform:scale(1.1);filter:brightness(1.45) saturate(1.6)}}
        @keyframes alien-scan{0%{background-position:200% 0}100%{background-position:-100% 0}}
      `}</style>
    </span>
  );
};
