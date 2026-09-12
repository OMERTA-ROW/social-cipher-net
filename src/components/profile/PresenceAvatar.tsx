import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  name?: string | null;
  size: number;
  isLive?: boolean;
  className?: string;
  showBadge?: boolean;
}

const PresenceAvatar = ({ src, name, size, isLive = false, className, showBadge = true }: Props) => (
  <span
    className={cn(
      "relative inline-flex shrink-0 rounded-full",
      isLive && "ring-2 ring-primary shadow-[0_0_14px_hsl(var(--primary)/0.8)]",
      className,
    )}
    aria-label={isLive ? `${name || "Member"} is live` : undefined}
  >
    <ProfileAvatar src={src} name={name} size={size} />
    {isLive && showBadge && (
      <span className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 rounded-full border border-primary bg-background px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary">
        LIVE
      </span>
    )}
  </span>
);

export default PresenceAvatar;
