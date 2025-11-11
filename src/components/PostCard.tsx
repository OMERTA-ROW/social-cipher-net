import { Heart, MessageCircle, Share2, BadgeCheck, Lock, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StoryRing from "@/components/StoryRing";
import { useState } from "react";

interface PostCardProps {
  postId: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isVerified?: boolean;
  monetizationType?: string;
  price?: number;
  isPaid?: boolean;
  hasStory?: boolean;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  replyCount?: number;
  onPaymentRequired?: () => void;
  onReply?: () => void;
}

const PostCard = ({ 
  postId,
  author, 
  avatar, 
  content, 
  timestamp, 
  likes, 
  comments, 
  isVerified,
  monetizationType = "free",
  price = 0,
  isPaid = false,
  hasStory = false,
  media = [],
  replyCount = 0,
  onPaymentRequired,
  onReply
}: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const isLocked = (monetizationType === "pay_per_view" || monetizationType === "pay_per_click") && !isPaid;

  const handleLike = () => {
    if (isLocked) {
      onPaymentRequired?.();
      return;
    }
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 p-6">
      <div className="flex items-start gap-4">
        <StoryRing 
          avatar={avatar}
          author={author}
          hasStory={hasStory}
          size="md"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground">{author}</h3>
            {isVerified && (
              <BadgeCheck className="w-5 h-5 text-primary fill-current" />
            )}
            <span className="text-sm text-muted-foreground">· {timestamp}</span>
          </div>

          {monetizationType !== "free" && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                {monetizationType === "pay_per_view" ? "💰 Pay Per View" : "🔗 Pay Per Click"}
              </span>
              <span className="font-semibold">${price}</span>
            </div>
          )}
          
          {isLocked ? (
            <div className="relative mb-4">
              <div className="blur-sm">
                <p className="text-foreground leading-relaxed">{content.substring(0, 50)}...</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                <button
                  onClick={onPaymentRequired}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Unlock for ${price}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-foreground mb-4 leading-relaxed">{content}</p>
              
              {/* Media Gallery */}
              {media.length > 0 && (
                <div className={`grid gap-2 mb-4 ${
                  media.length === 1 ? 'grid-cols-1' : 
                  media.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {media.map((item, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden bg-secondary aspect-square">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={`Post media ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={item.url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
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
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={() => {
                if (isLocked) {
                  onPaymentRequired?.();
                } else {
                  onReply?.();
                }
              }}
            >
              <MessageCircle className="w-5 h-5" />
              <span>{replyCount || comments}</span>
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