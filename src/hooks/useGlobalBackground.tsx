import { useState, ReactNode } from "react";

export interface GlobalBackgroundState {
  component: ReactNode | null;
  name: string | null;
}

export function useGlobalBackground() {
  const [background, setBackground] = useState<GlobalBackgroundState>({
    component: null,
    name: null,
  });

  const setActiveBackground = (name: string, component: ReactNode) => {
    setBackground({ component, name });
  };

  const clearBackground = () => {
    setBackground({ component: null, name: null });
  };

  return {
    background,
    setActiveBackground,
    clearBackground,
  };
}
