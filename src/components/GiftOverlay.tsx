import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StreamGift {
  id: string;
  gift: {
    name: string;
    icon_url: string;
    animation_type: string;
  };
  sender_username: string;
  message: string | null;
}

interface GiftOverlayProps {
  gifts: StreamGift[];
}

export function GiftOverlay({ gifts }: GiftOverlayProps) {
  const [displayedGifts, setDisplayedGifts] = useState<(StreamGift & { key: string })[]>([]);

  useEffect(() => {
    if (gifts.length > 0) {
      const latestGift = gifts[0];
      const giftWithKey = {
        ...latestGift,
        key: `${latestGift.id}-${Date.now()}`,
      };
      
      setDisplayedGifts((prev) => [...prev, giftWithKey]);

      setTimeout(() => {
        setDisplayedGifts((prev) => prev.filter((g) => g.key !== giftWithKey.key));
      }, 5000);
    }
  }, [gifts]);

  const getAnimationVariants = (type: string) => {
    switch (type) {
      case "float":
        return {
          initial: { y: "100vh", opacity: 0, scale: 0.5 },
          animate: { 
            y: [null, "-50vh", "-100vh"], 
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.2, 1, 0.8]
          },
          transition: { duration: 5 }
        };
      case "sparkle":
        return {
          initial: { scale: 0, rotate: 0, opacity: 0 },
          animate: { 
            scale: [0, 1.5, 1, 1.2, 0],
            rotate: [0, 180, 360],
            opacity: [0, 1, 1, 1, 0]
          },
          transition: { duration: 5 }
        };
      case "flame":
        return {
          initial: { y: "100vh", x: 0, opacity: 0 },
          animate: { 
            y: [null, "20vh", "-80vh"],
            x: [0, -20, 20, -20, 0],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.3, 1]
          },
          transition: { duration: 5 }
        };
      case "shine":
        return {
          initial: { scale: 0, rotate: 0, opacity: 0 },
          animate: { 
            scale: [0, 2, 1.5, 0],
            rotate: [0, 360, 720],
            opacity: [0, 1, 1, 0]
          },
          transition: { duration: 5 }
        };
      case "royal":
        return {
          initial: { y: "-100vh", scale: 0, opacity: 0 },
          animate: { 
            y: [null, "40vh"],
            scale: [0, 1.8, 1.2],
            opacity: [0, 1, 1, 0],
            rotate: [0, 360]
          },
          transition: { duration: 5 }
        };
      case "launch":
        return {
          initial: { y: "100vh", x: "-50vw", opacity: 0 },
          animate: { 
            y: [null, "-150vh"],
            x: [null, "50vw"],
            opacity: [0, 1, 1, 0],
            rotate: [0, 45],
            scale: [0.5, 1.5, 1]
          },
          transition: { duration: 5 }
        };
      default:
        return {
          initial: { y: "100vh", opacity: 0 },
          animate: { y: "-100vh", opacity: [0, 1, 1, 0] },
          transition: { duration: 5 }
        };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {displayedGifts.map((gift) => {
          const animation = getAnimationVariants(gift.gift.animation_type);
          const randomX = Math.random() * 80 + 10;
          
          return (
            <motion.div
              key={gift.key}
              className="absolute"
              style={{ left: `${randomX}%` }}
              initial={animation.initial}
              animate={animation.animate}
              exit={{ opacity: 0, scale: 0 }}
              transition={animation.transition}
            >
              <div className="text-center">
                <div className="text-9xl drop-shadow-2xl">{gift.gift.icon_url}</div>
                <div className="mt-4 bg-background/90 backdrop-blur rounded-lg p-4 shadow-2xl border border-primary/20">
                  <p className="text-xl font-bold text-primary">{gift.sender_username}</p>
                  <p className="text-lg text-foreground font-semibold">{gift.gift.name}</p>
                  {gift.message && (
                    <p className="text-sm text-muted-foreground italic mt-2">"{gift.message}"</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
