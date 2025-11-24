import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseFourClickCloseProps {
  onFourClicks: () => void;
  timeWindow?: number; // Time window in ms for clicks to count (default 2000ms)
}

export const useFourClickClose = ({ 
  onFourClicks, 
  timeWindow = 2000 
}: UseFourClickCloseProps) => {
  const clickCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClick = () => {
      clickCountRef.current += 1;
      
      // Show progress feedback
      if (clickCountRef.current === 1) {
        toast.info("Click 3 more times to close all windows", { duration: 1000 });
      } else if (clickCountRef.current === 2) {
        toast.info("Click 2 more times...", { duration: 1000 });
      } else if (clickCountRef.current === 3) {
        toast.info("Click 1 more time...", { duration: 1000 });
      } else if (clickCountRef.current >= 4) {
        toast.success("Closing all windows!");
        onFourClicks();
        clickCountRef.current = 0;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Reset counter after time window
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        timeoutRef.current = null;
      }, timeWindow);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onFourClicks, timeWindow]);
};
