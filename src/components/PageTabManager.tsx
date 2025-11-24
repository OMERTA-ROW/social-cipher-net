import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { Card } from "@/components/ui/card";

export const PageTabManager = () => {
  const { windows, closeWindow, bringToFront } = useFloatingWindowsContext();

  if (windows.length === 0) return null;

  return (
    <Card className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur p-2 flex gap-2 items-center">
      <span className="text-sm text-muted-foreground px-2">Open Pages:</span>
      {windows.map((window) => (
        <Badge
          key={window.id}
          variant="secondary"
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={() => bringToFront(window.id)}
        >
          <span>{window.title}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4 p-0 hover:bg-destructive/20"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </Card>
  );
};
