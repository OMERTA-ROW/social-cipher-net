import { useCallback, useEffect, useState, ReactNode } from "react";

export type WindowWorkspace = "main" | "space";

export interface FloatingWindowData {
  id: string;
  title: string;
  content: ReactNode;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
  workspace: WindowWorkspace;
}

const DESKTOP_KEY = "cyberlink:desktop";
const workspaceKey = (title: string) => `cyberlink:window-workspace:${title}`;

const readDesktop = (): WindowWorkspace => {
  try {
    return localStorage.getItem(DESKTOP_KEY) === "space" ? "space" : "main";
  } catch {
    return "main";
  }
};

const readWorkspace = (title: string): WindowWorkspace => {
  try {
    return localStorage.getItem(workspaceKey(title)) === "space" ? "space" : "main";
  } catch {
    return "main";
  }
};

const writeWorkspace = (title: string, workspace: WindowWorkspace) => {
  try {
    localStorage.setItem(workspaceKey(title), workspace);
  } catch {
    /* storage unavailable */
  }
};

export function useFloatingWindows() {
  const [windows, setWindows] = useState<FloatingWindowData[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(50);
  const [desktop, setDesktopState] = useState<WindowWorkspace>(() => readDesktop());

  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_KEY, desktop);
    } catch {
      /* storage unavailable */
    }
  }, [desktop]);

  const setDesktop = useCallback((next: WindowWorkspace) => setDesktopState(next), []);
  const toggleDesktop = useCallback(
    () => setDesktopState((d) => (d === "main" ? "space" : "main")),
    [],
  );

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
        workspace: readWorkspace(title),
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

  /** Move a window between the main interface and the solar system desktop. */
  const setWindowWorkspace = useCallback((id: string, workspace: WindowWorkspace) => {
    setWindows(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        writeWorkspace(w.title, workspace);
        return { ...w, workspace };
      }),
    );
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    closeAllWindows,
    bringToFront,
    desktop,
    setDesktop,
    toggleDesktop,
    setWindowWorkspace,
  };
}
