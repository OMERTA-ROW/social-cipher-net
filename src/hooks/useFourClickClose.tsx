import { useEffect, useRef } from "react";


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
      
      // Silent gesture: no popups for regular users
      if (clickCountRef.current >= 4) {
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
