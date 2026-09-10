import { useState, useRef, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Minus, Maximize2, Move } from "lucide-react";
import { toast } from "sonner";

interface FloatingWindowProps {
  id: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
  width?: number;
  height?: number;
}

export default function FloatingWindow({
  id,
  title,
  children,
  onClose,
  initialX = 100,
  initialY = 100,
  width = 600,
  height = 400,
}: FloatingWindowProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggable, setIsDraggable] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Four-tap gesture handler
  const handleTap = () => {
    setTapCount(prev => prev + 1);
    
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    
    const timer = setTimeout(() => {
      const currentTapCount = tapCount + 1;
      
      if (currentTapCount === 4) {
        setIsDraggable(prev => !prev);
      }
      
      setTapCount(0);
    }, 500);
    
    setTapTimer(timer);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!isDraggable) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!isDraggable) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && isDraggable) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && isDraggable) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={windowRef}
      className={`fixed z-50 shadow-2xl transition-all ${isDraggable ? 'ring-2 ring-primary/50' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? "300px" : `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
        pointerEvents: 'auto',
      }}
    >
      <Card className="h-full flex flex-col border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader
          className={`border-b bg-muted/30 py-2 px-4 ${isDraggable ? 'cursor-move' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleTap}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {isDraggable && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Move className="h-3 w-3" />
                  Movable
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent className="flex-1 p-4 overflow-auto">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
