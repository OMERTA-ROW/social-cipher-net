import { createContext, useContext, ReactNode } from "react";
import { useFloatingWindows, FloatingWindowData, WindowWorkspace } from "@/hooks/useFloatingWindows";
import FloatingWindow from "@/components/FloatingWindow";

interface FloatingWindowsContextType {
  windows: FloatingWindowData[];
  openWindow: (title: string, content: ReactNode, width?: number, height?: number) => void;
  closeWindow: (id: string) => void;
  closeAllWindows: () => void;
  bringToFront: (id: string) => void;
  desktop: WindowWorkspace;
  setDesktop: (workspace: WindowWorkspace) => void;
  toggleDesktop: () => void;
  setWindowWorkspace: (id: string, workspace: WindowWorkspace) => void;
}

const FloatingWindowsContext = createContext<FloatingWindowsContextType | undefined>(undefined);

export const useFloatingWindowsContext = () => {
  const context = useContext(FloatingWindowsContext);
  if (!context) {
    throw new Error("useFloatingWindowsContext must be used within FloatingWindowsProvider");
  }
  return context;
};

export const FloatingWindowsProvider = ({ children }: { children: ReactNode }) => {
  const floatingWindows = useFloatingWindows();
  const { desktop } = floatingWindows;

  return (
    <FloatingWindowsContext.Provider value={floatingWindows}>
      {children}
      
      <div className="fixed inset-0 pointer-events-none z-50" style={{ pointerEvents: 'none' }}>
        {floatingWindows.windows
          .filter((window) => window.workspace === desktop)
          .map((window) => (
          <div 
            key={window.id} 
            style={{ pointerEvents: 'auto', zIndex: window.zIndex || 50 }}
            onClick={() => floatingWindows.bringToFront(window.id)}
          >
            <FloatingWindow
              id={window.id}
              title={window.title}
              onClose={() => floatingWindows.closeWindow(window.id)}
              initialX={window.x}
              initialY={window.y}
              width={window.width}
              height={window.height}
              workspace={window.workspace}
              onToggleWorkspace={() =>
                floatingWindows.setWindowWorkspace(
                  window.id,
                  window.workspace === "space" ? "main" : "space",
                )
              }
            >
              {window.content}
            </FloatingWindow>
          </div>
        ))}
      </div>
    </FloatingWindowsContext.Provider>
  );
};
