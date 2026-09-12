/**
 * Sharp circular avatar.
 *
 * The stored avatar is rendered at 512px, so every slot asks for an image at
 * least twice its display size and declares real intrinsic dimensions. That
 * keeps it crisp on high-DPI screens and stops the browser from stretching an
 * undersized file.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  name?: string | null;
  /** Displayed diameter in CSS pixels. */
  size: number;
  className?: string;
}

const ProfileAvatar = ({ src, name, size, className }: Props) => {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  const pixels = size * 2; // 2x source for high-DPI screens

  return (
    <Avatar className={cn("shrink-0", className)} style={{ width: size, height: size }}>
      {src && (
        <AvatarImage
          src={src}
          alt={name ? `${name}'s picture` : "Profile picture"}
          width={pixels}
          height={pixels}
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
      <AvatarFallback style={{ fontSize: Math.max(12, size / 2.6) }}>{initial}</AvatarFallback>
    </Avatar>
  );
};

export default ProfileAvatar;
