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
      className={`inline-block overflow-hidden rounded-full ring-2 ${ring} ${className} animate-[alien-breathe_3.6s_ease-in-out_infinite]`}
      aria-label={resolved === "draco" ? "Draco alien AI" : "Zozo alien AI"}
    >
      <img
        src={src}
        alt={resolved === "draco" ? "Draco alien portrait" : "Zozo alien portrait"}
        className="h-full w-full object-cover animate-[alien-sway_6s_ease-in-out_infinite]"
        loading="lazy"
        width={64}
        height={64}
        draggable={false}
      />
      <style>{`
        @keyframes alien-breathe{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.04);filter:brightness(1.15)}}
        @keyframes alien-sway{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.5%,-1%)}50%{transform:translate(1%,1.5%)}75%{transform:translate(1.5%,-0.5%)}}
      `}</style>
    </span>
  );
};
