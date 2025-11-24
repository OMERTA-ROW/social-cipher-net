import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Folder } from "lucide-react";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useSavedTabs } from "@/hooks/useSavedTabs";
import { toast } from "sonner";

export const PageTabManager = () => {
  const { windows, closeWindow, bringToFront, openWindow } = useFloatingWindowsContext();
  const { savedTabs } = useSavedTabs();
  const [showSavedTabs, setShowSavedTabs] = useState(false);

  const handleOpenSavedTab = (tab: any) => {
    openWindow(
      tab.tab_name,
      <iframe
        src={tab.tab_url}
        className="w-full h-full border-0"
        title={tab.tab_name}
      />,
      1200,
      800
    );
    toast.success(`Opening ${tab.tab_name}`);
    setShowSavedTabs(false);
  };

  if (windows.length === 0 && savedTabs.length === 0) return null;

  return (
    <>
      <Card className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur p-2 flex gap-2 items-center">
        <span className="text-sm text-muted-foreground px-2">Open Pages:</span>
        {windows.map((window) => (
          <Badge
            key={window.id}
            variant="secondary"
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => bringToFront(window.id)}
            onDoubleClick={() => bringToFront(window.id)}
            title="Click to focus • Double-click to bring to front"
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
              title="Close tab"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        {savedTabs.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSavedTabs(true)}
            className="ml-2"
            title="View all saved tabs"
          >
            <Folder className="h-4 w-4 mr-1" />
            Saved ({savedTabs.length})
          </Button>
        )}
      </Card>

      <Dialog open={showSavedTabs} onOpenChange={setShowSavedTabs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Saved Tabs - Available Across CyberLink</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="grid grid-cols-2 gap-3">
              {savedTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleOpenSavedTab(tab)}
                >
                  <div className="text-left">
                    <div className="font-semibold">{tab.tab_name}</div>
                    <div className="text-xs text-muted-foreground">{tab.tab_type}</div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
