import { useEffect } from "react";
import { useWalletSecurity } from "@/hooks/useWalletSecurity";
import { useLocation } from "react-router-dom";

export const SecurityMonitor = () => {
  const { logSecurityEvent } = useWalletSecurity();
  const location = useLocation();

  useEffect(() => {
    // Monitor page navigation
    logSecurityEvent("page_navigation", location.pathname, {
      route: location.pathname,
      timestamp: Date.now()
    });
  }, [location.pathname]);

  useEffect(() => {
    // Monitor rapid clicks (potential bot behavior)
    let clickCount = 0;
    const clickWindow = 2000; // 2 seconds
    let clickTimeout: NodeJS.Timeout;

    const handleClick = () => {
      clickCount++;
      
      if (clickCount > 20) {
        logSecurityEvent("rapid_clicking", "potential_bot", {
          clicks: clickCount,
          timeWindow: clickWindow
        });
      }

      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        clickCount = 0;
      }, clickWindow);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      clearTimeout(clickTimeout);
    };
  }, []);

  return null; // This is a monitoring component with no UI
};
