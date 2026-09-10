import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Trash2 } from "lucide-react";
import { useSavedTabs } from "@/hooks/useSavedTabs";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import { toast } from "sonner";

export const SavedTabsManager = () => {
  const { savedTabs, deleteTab } = useSavedTabs();
  const { openWindow } = useFloatingWindowsContext();

  const handleOpenTab = (tab: any) => {
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
  };

  if (savedTabs.length === 0) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <p className="text-muted-foreground text-center">
          No saved tabs yet. Search for a platform above to get started!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
      <h3 className="text-xl font-bold text-foreground mb-4">Your Saved Tabs</h3>
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedTabs.map((tab) => (
            <Card key={tab.id} className="p-4 bg-muted/20 border-primary/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{tab.tab_name}</h4>
                  <Badge variant="outline" className="text-xs mt-1">{tab.tab_type}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenTab(tab)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteTab(tab.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
