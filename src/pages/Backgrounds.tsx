import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Type } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";

const Backgrounds = () => {
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("All Seeing Eye\nMultiverse Explorer");
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <header className="fixed left-4 top-4 z-50 max-w-[calc(100vw-2rem)]">
        <Button variant="ghost" size="sm" asChild className="mb-2 bg-background/60 backdrop-blur-xl">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
        </Button>
        <h1 className="hologram-title text-2xl font-bold sm:text-3xl">Space Backgrounds</h1>
        <p className="mt-1 text-xs text-muted-foreground">Control the full-screen galaxy workspace.</p>
      </header>
      {/* Full-screen All Seeing Eye Background */}
      <div className="absolute inset-0 w-full h-full">
      </div>

      {/* Text Overlay */}
      {showTextOverlay && !editMode && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="text-center space-y-4 px-4 max-w-4xl">
            {overlayText.split('\n').map((line, idx) => (
              <p
                key={idx}
                className="hologram-title text-4xl md:text-6xl lg:text-7xl font-bold"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Text Editor Overlay */}
      {editMode && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Type className="w-5 h-5" />
                Edit Overlay Text
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Enter text (use line breaks for multiple lines)"
              className="min-h-[200px] font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setShowTextOverlay(true);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant={showTextOverlay ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTextOverlay(!showTextOverlay)}
          className="backdrop-blur-xl bg-background/20 border-primary/30"
        >
          <Type className="w-4 h-4 mr-2" />
          {showTextOverlay ? "Hide" : "Show"} Text
        </Button>
        {showTextOverlay && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(true)}
            className="backdrop-blur-xl bg-background/20 border-primary/30"
          >
            Edit Text
          </Button>
        )}
      </div>
    </div>
  );
};

export default Backgrounds;
