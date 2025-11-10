import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Studio from "./pages/Studio";
import Auth from "./pages/Auth";
import Affiliate from "./pages/Affiliate";
import SellerRegister from "./pages/SellerRegister";
import SellerDashboard from "./pages/SellerDashboard";
import Monetization from "./pages/Monetization";
import CyberGamers from "./pages/CyberGamers";
import NotFound from "./pages/NotFound";
import AIBotAssistant from "./components/AIBotAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/seller-register" element={<SellerRegister />} />
          <Route path="/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/monetization" element={<Monetization />} />
          <Route path="/cyber-gamers" element={<CyberGamers />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AIBotAssistant />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
