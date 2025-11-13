import { createContext, useContext, ReactNode } from "react";
import { useFloatingWindows, FloatingWindowData } from "@/hooks/useFloatingWindows";
import FloatingWindow from "@/components/FloatingWindow";

interface FloatingWindowsContextType {
  windows: FloatingWindowData[];
  openWindow: (title: string, content: ReactNode) => void;
  closeWindow: (id: string) => void;
  closeAllWindows: () => void;
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

  return (
    <FloatingWindowsContext.Provider value={floatingWindows}>
      {children}
      
      {/* Render all floating windows with high z-index */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {floatingWindows.windows.map((window) => (
          <FloatingWindow
            key={window.id}
            id={window.id}
            title={window.title}
            onClose={() => floatingWindows.closeWindow(window.id)}
            initialX={window.x}
            initialY={window.y}
          >
            {window.content}
          </FloatingWindow>
        ))}
      </div>
    </FloatingWindowsContext.Provider>
  );
};
