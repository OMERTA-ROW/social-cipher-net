import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface PostCardProps {
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

const PostCard = ({ author, avatar, content, timestamp, likes, comments }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-12 h-12 border-2 border-primary/30">
          <AvatarImage src={avatar} alt={author} />
          <AvatarFallback className="bg-secondary text-foreground">
            {author.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground">{author}</h3>
            <span className="text-sm text-muted-foreground">· {timestamp}</span>
          </div>
          
          <p className="text-foreground mb-4 leading-relaxed">{content}</p>
          
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`gap-2 ${isLiked ? 'text-accent' : 'text-muted-foreground'} hover:text-accent`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <MessageCircle className="w-5 h-5" />
              <span>{comments}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
