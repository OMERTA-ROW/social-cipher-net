import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Web3Provider } from "@/providers/Web3Provider";
import { FloatingWindowsProvider } from "@/providers/FloatingWindowsProvider";
import { FourClickCloseWrapper } from "@/components/FourClickCloseWrapper";
import { SecurityMonitor } from "@/components/SecurityMonitor";
import Index from "./pages/Index";
import Studio from "./pages/Studio";
import Auth from "./pages/Auth";
import Affiliate from "./pages/Affiliate";
import SellerRegister from "./pages/SellerRegister";
import SellerDashboard from "./pages/SellerDashboard";
import Monetization from "./pages/Monetization";
import CyberGamers from "./pages/CyberGamers";
import CyberStreamer from "./pages/CyberStreamer";
import NotFound from "./pages/NotFound";
import Security from "./pages/Security";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import Verification from "./pages/Verification";
import VerificationSuccess from "./pages/VerificationSuccess";
import Subscription from "./pages/Subscription";
import AffiliateLinks from "./pages/AffiliateLinks";
import CyberWorld from "./pages/CyberWorld";
import Miners from "./pages/Miners";
import UserProfile from "./pages/UserProfile";
import TokenPurchase from "./pages/TokenPurchase";
import Backgrounds from "./pages/Backgrounds";
import SolarSystemVoyage from "./pages/SolarSystemVoyage";
import Profile from "./pages/Profile";
import Thread from "./pages/Thread";
import AIBotAssistant from "./components/AIBotAssistant";
import { AIEcosystemDashboard } from "./components/AIEcosystemDashboard";
import RealisticSpaceBackground from "./components/RealisticSpaceBackground";

const AppContent = () => {
  const location = useLocation();
  const showAIBot = location.pathname !== "/cyber-arena";

  return (
    <>
      <RealisticSpaceBackground />
      <SecurityMonitor />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/affiliate" element={<Affiliate />} />
        <Route path="/seller-register" element={<SellerRegister />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/monetization" element={<Monetization />} />
        <Route path="/cyber-arena" element={<CyberGamers />} />
        <Route path="/cyber-streamer" element={<CyberStreamer />} />
        <Route path="/security" element={<Security />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/verification-success" element={<VerificationSuccess />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/affiliate-links" element={<AffiliateLinks />} />
        <Route path="/cyber-world" element={<CyberWorld />} />
        <Route path="/miners" element={<Miners />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/token-purchase" element={<TokenPurchase />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/ai-ecosystem" element={<AIEcosystemDashboard />} />
        <Route path="/backgrounds" element={<Backgrounds />} />
        <Route path="/voyage" element={<SolarSystemVoyage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showAIBot && <AIBotAssistant />}
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FloatingWindowsProvider>
          <FourClickCloseWrapper>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </FourClickCloseWrapper>
        </FloatingWindowsProvider>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
