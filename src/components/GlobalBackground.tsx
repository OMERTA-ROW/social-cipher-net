import { useGlobalBackgroundContext } from "@/contexts/GlobalBackgroundContext";
import { useState, useEffect } from "react";

export const GlobalBackground = () => {
  const { background, clearBackground } = useGlobalBackgroundContext();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (background.component) {
      setIsClosing(false);
    }
  }, [background.component]);

  const handleDoubleClick = () => {
    setIsClosing(true);
    setTimeout(() => {
      clearBackground();
    }, 300);
  };

  if (!background.component) return null;

  return (
    <div
      className={`fixed inset-0 z-0 transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: "pointer" }}
      title="Double-click to close background"
    >
      {background.component}
    </div>
  );
};
