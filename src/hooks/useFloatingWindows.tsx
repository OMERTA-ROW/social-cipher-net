import { useState, ReactNode } from "react";

export interface FloatingWindowData {
  id: string;
  title: string;
  content: ReactNode;
  x: number;
  y: number;
}

export function useFloatingWindows() {
  const [windows, setWindows] = useState<FloatingWindowData[]>([]);

  const openWindow = (title: string, content: ReactNode) => {
    const id = `window-${Date.now()}-${Math.random()}`;
    const offset = windows.length * 30;
    
    setWindows(prev => [
      ...prev,
      {
        id,
        title,
        content,
        x: 100 + offset,
        y: 100 + offset,
      },
    ]);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const closeAllWindows = () => {
    setWindows([]);
  };

  return {
    windows,
    openWindow,
    closeWindow,
    closeAllWindows,
  };
}
