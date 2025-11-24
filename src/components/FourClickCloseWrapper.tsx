import { ReactNode } from "react";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { useFourClickClose } from "@/hooks/useFourClickClose";

interface FourClickCloseWrapperProps {
  children: ReactNode;
}

export const FourClickCloseWrapper = ({ children }: FourClickCloseWrapperProps) => {
  const { closeAllWindows } = useFloatingWindowsContext();

  useFourClickClose({
    onFourClicks: closeAllWindows,
    timeWindow: 2000, // 2 seconds to complete 4 clicks
  });

  return <>{children}</>;
};
