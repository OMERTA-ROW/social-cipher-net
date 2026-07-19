import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFloatingWindowsContext } from "@/providers/FloatingWindowsProvider";
import CyberSpaceBackground from "./CyberSpaceBackground";
import RealisticSpaceBackground from "./RealisticSpaceBackground";
import SolarMatrixBackground from "./SolarMatrixBackground";
import { DracoMiningBackground } from "./DracoMiningBackground";
import MatrixOverlay from "./MatrixOverlay";
import SolarSystemBackground from "./SolarSystemBackground";

const backgrounds = [
  {
    id: "cyber",
    name: "Cyber Space",
    component: <CyberSpaceBackground />,
  },
  {
    id: "realistic",
    name: "Realistic Space",
    component: <RealisticSpaceBackground />,
  },
  {
    id: "solar",
    name: "Solar Matrix",
    component: <SolarMatrixBackground />,
  },
  {
    id: "draco",
    name: "Draco Mining",
    component: <DracoMiningBackground isActive={true} />,
  },
  {
    id: "matrix",
    name: "Matrix Rain",
    component: <MatrixOverlay />,
  },
  {
    id: "voyage",
    name: "Solar System Voyage",
    component: <SolarSystemBackground />,
  },
];

export const BackgroundSelector = () => {
  const { openWindow } = useFloatingWindowsContext();

  const handleSetBackground = (bg: typeof backgrounds[0]) => {
    openWindow(bg.name, bg.component, 800, 600);
  };

  return (
    <Card className="p-6 bg-background/95 backdrop-blur">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Background Selector</h2>
      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gallery" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {backgrounds.map((bg) => (
              <Button
                key={bg.id}
                onClick={() => handleSetBackground(bg)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <span className="text-sm font-medium">{bg.name}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {backgrounds.map((bg) => (
              <div key={bg.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{bg.name}</h3>
                  <Button 
                    onClick={() => handleSetBackground(bg)} 
                    size="sm"
                    variant="outline"
                  >
                    Open
                  </Button>
                </div>
                <div className="h-40 rounded-lg overflow-hidden border border-border relative">
                  <div className="absolute inset-0 scale-50 origin-top-left">
                    {bg.component}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
