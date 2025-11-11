import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface StoryRingProps {
  avatar?: string;
  author: string;
  hasStory?: boolean;
  isLive?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const StoryRing = ({ avatar, author, hasStory = false, isLive = false, size = "md", onClick }: StoryRingProps) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div 
      className={cn(
        "relative cursor-pointer group",
        onClick && "hover:scale-105 transition-transform duration-200"
      )}
      onClick={onClick}
    >
      {/* Live Ring - Pulsing red border animation */}
      {isLive && (
        <>
          <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-tr from-red-500 via-red-600 to-red-500 animate-pulse">
            <div className="absolute inset-[3px] rounded-full bg-background" />
          </div>
          {/* Outer glow effect */}
          <div className="absolute inset-[-4px] rounded-full bg-red-500/30 blur-md animate-pulse" />
        </>
      )}
      
      {/* Story Ring - Gradient border animation (only if not live) */}
      {!isLive && hasStory && (
        <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_3s_linear_infinite]">
          <div className="absolute inset-[2px] rounded-full bg-background" />
        </div>
      )}
      
      {/* Avatar */}
      <Avatar className={cn(
        sizeClasses[size],
        "relative z-10 border-2",
        isLive ? "border-transparent" : hasStory ? "border-transparent" : "border-primary/30"
      )}>
        <AvatarImage src={avatar} alt={author} />
        <AvatarFallback className="bg-secondary text-foreground">
          {author.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Live Badge */}
      {isLive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20">
          <div className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            <Radio className="w-2 h-2 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryRing;
