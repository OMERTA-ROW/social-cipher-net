import { useCallback } from "react";
import { toast } from "sonner";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";

export interface OpenableTab {
  tab_name: string;
  tab_url: string;
}

/** Shared behaviour for opening a saved tab inside a floating window. */
export const useOpenSavedTab = () => {
  const { openWindow } = useFloatingWindowsContext();

  return useCallback(
    (tab: OpenableTab) => {
      openWindow(
        tab.tab_name,
        <iframe src={tab.tab_url} className="w-full h-full border-0" title={tab.tab_name} />,
        1200,
        800,
      );
      toast.success(`Opening ${tab.tab_name}`);
    },
    [openWindow],
  );
};
