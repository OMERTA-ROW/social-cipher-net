import { useState, ReactNode } from "react";

export interface FloatingWindowData {
  id: string;
  title: string;
  content: ReactNode;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

export function useFloatingWindows() {
  const [windows, setWindows] = useState<FloatingWindowData[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(50);

  const openWindow = (title: string, content: ReactNode, width?: number, height?: number) => {
    const id = `window-${Date.now()}-${Math.random()}`;
    const offset = windows.length * 30;
    const newZIndex = maxZIndex + 1;
    
    setWindows(prev => [
      ...prev,
      {
        id,
        title,
        content,
        x: 100 + offset,
        y: 100 + offset,
        width,
        height,
        zIndex: newZIndex,
      },
    ]);
    setMaxZIndex(newZIndex);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const closeAllWindows = () => {
    setWindows([]);
  };

  const bringToFront = (id: string) => {
    const newZIndex = maxZIndex + 1;
    setWindows(prev => 
      prev.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w)
    );
    setMaxZIndex(newZIndex);
  };

  return {
    windows,
    openWindow,
    closeWindow,
    closeAllWindows,
    bringToFront,
  };
}
