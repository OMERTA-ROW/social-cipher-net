import { useState } from "react";
import { Sparkles, Infinity, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MultiverseViewpointAIProps {
  onViewpointGenerated: (viewpoint: any) => void;
}

export const MultiverseViewpointAI = ({ onViewpointGenerated }: MultiverseViewpointAIProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateViewpoint = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a viewpoint description", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in to generate viewpoints", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      // Call Lovable AI to generate viewpoint parameters
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cyberlink-ai-ecosystem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'generate_viewpoint',
          prompt: prompt,
          context: 'multiverse_cosmic_perspective'
        })
      });

      if (!response.ok) throw new Error('AI generation failed');

      const aiResult = await response.json();
      
      // Parse AI response to extract viewpoint parameters
      const viewpoint = parseAIViewpoint(aiResult.response, prompt);
      
      // Save to database with metadata
      const { error } = await supabase
        .from('favorite_pov_views')
        .insert({
          user_id: session.user.id,
          pov_index: -1, // AI-generated custom viewpoint
          pov_name: viewpoint.name,
          custom_name: prompt.substring(0, 50),
          metadata: {
            camera: viewpoint.camera,
            effects: viewpoint.effects,
            description: viewpoint.description,
            generated_at: new Date().toISOString(),
            type: 'ai_multiverse'
          }
        });

      if (error) throw error;

      toast({ 
        title: "✨ AI Viewpoint Generated!", 
        description: `Created: ${viewpoint.name}` 
      });

      onViewpointGenerated(viewpoint);
      setPrompt("");
    } catch (error) {
      console.error('Viewpoint generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: "Try a different description",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMultiverseScenario = async () => {
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in to explore multiverse", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      // Generate random multiverse scenario
      const scenarios = [
        "A parallel universe where gravity flows sideways",
        "Dimension where time crystallizes into visible structures",
        "Reality where dark matter is luminescent",
        "Universe with inverted physics laws",
        "Cosmic realm where thoughts manifest as stars",
        "Dimension between dimensions - the void space",
        "Reality where all possible timelines converge",
        "Universe built on pure quantum probability",
        "Realm where entropy reverses",
        "Cosmic sea where universes are bubbles"
      ];

      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      setPrompt(randomScenario);
      
      toast({ 
        title: "🌌 Multiverse Scenario Generated", 
        description: randomScenario 
      });
    } catch (error) {
      console.error('Multiverse generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Infinity className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="font-bold text-foreground">Multiverse Viewpoint AI</h3>
        <Sparkles className="w-4 h-4 text-accent" />
      </div>

      <Textarea
        placeholder="Describe your cosmic viewpoint... (e.g., 'View from inside a neutron star', 'Edge of a black hole event horizon', 'Between parallel universes')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-24 resize-none"
        disabled={isGenerating}
      />

      <div className="flex gap-2">
        <Button
          onClick={generateViewpoint}
          disabled={isGenerating || !prompt.trim()}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate Viewpoint
        </Button>

        <Button
          onClick={generateMultiverseScenario}
          disabled={isGenerating}
          variant="outline"
          className="flex-1"
        >
          <Zap className="w-4 h-4 mr-2" />
          Random Multiverse
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        AI generates unlimited cosmic perspectives using multiverse algorithms
      </p>
    </div>
  );
};

// Parse AI response into viewpoint parameters
function parseAIViewpoint(aiResponse: string, originalPrompt: string) {
  // Extract or generate viewpoint parameters from AI response
  const viewpoint = {
    name: originalPrompt.substring(0, 50) || "Custom AI Viewpoint",
    camera: {
      position: [0, 0, 0],
      lookAt: [0, 0, 0],
      fov: 75
    },
    effects: {
      distortion: 0,
      chromatic: 0,
      bloom: 0
    },
    description: aiResponse
  };

  // Parse AI response for cosmic coordinates and parameters
  const positionMatch = aiResponse.match(/position[:\s]+\[?(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)\]?/i);
  if (positionMatch) {
    viewpoint.camera.position = [
      parseFloat(positionMatch[1]),
      parseFloat(positionMatch[2]),
      parseFloat(positionMatch[3])
    ];
  } else {
    // Generate interesting random position if AI didn't specify
    viewpoint.camera.position = [
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 200
    ];
  }

  // Look at point
  const lookAtMatch = aiResponse.match(/lookAt[:\s]+\[?(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)\]?/i);
  if (lookAtMatch) {
    viewpoint.camera.lookAt = [
      parseFloat(lookAtMatch[1]),
      parseFloat(lookAtMatch[2]),
      parseFloat(lookAtMatch[3])
    ];
  }

  return viewpoint;
}