import { createContext, useContext, ReactNode } from "react";
import { useGlobalBackground, GlobalBackgroundState } from "@/hooks/useGlobalBackground";

interface GlobalBackgroundContextType {
  background: GlobalBackgroundState;
  setActiveBackground: (name: string, component: ReactNode) => void;
  clearBackground: () => void;
}

const GlobalBackgroundContext = createContext<GlobalBackgroundContextType | undefined>(undefined);

export const useGlobalBackgroundContext = () => {
  const context = useContext(GlobalBackgroundContext);
  if (!context) {
    throw new Error("useGlobalBackgroundContext must be used within GlobalBackgroundProvider");
  }
  return context;
};

export const GlobalBackgroundProvider = ({ children }: { children: ReactNode }) => {
  const backgroundState = useGlobalBackground();

  return (
    <GlobalBackgroundContext.Provider value={backgroundState}>
      {children}
    </GlobalBackgroundContext.Provider>
  );
};
