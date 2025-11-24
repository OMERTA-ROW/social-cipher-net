import { BackgroundSelector } from "@/components/BackgroundSelector";
import { BackgroundTabManager } from "@/components/BackgroundTabManager";
import Navigation from "@/components/Navigation";

const Backgrounds = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <Navigation />
      <BackgroundTabManager />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <BackgroundSelector />
        </div>
      </div>
    </div>
  );
};

export default Backgrounds;
