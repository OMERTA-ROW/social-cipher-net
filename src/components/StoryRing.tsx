import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface StoryRingProps {
  avatar?: string;
  author: string;
  hasStory?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const StoryRing = ({ avatar, author, hasStory = false, size = "md", onClick }: StoryRingProps) => {
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
      {/* Story Ring - Gradient border animation */}
      {hasStory && (
        <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_3s_linear_infinite]">
          <div className="absolute inset-[2px] rounded-full bg-background" />
        </div>
      )}
      
      {/* Avatar */}
      <Avatar className={cn(
        sizeClasses[size],
        "relative z-10 border-2",
        hasStory ? "border-transparent" : "border-primary/30"
      )}>
        <AvatarImage src={avatar} alt={author} />
        <AvatarFallback className="bg-secondary text-foreground">
          {author.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default StoryRing;
