import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/providers/Web3Provider";
import { FloatingWindowsProvider } from "@/providers/FloatingWindowsProvider";
import { FourClickCloseWrapper } from "@/components/FourClickCloseWrapper";
import { CartProvider } from "@/hooks/useCart";
import CartSheet from "@/components/shop/CartSheet";
import { SecurityMonitor } from "@/components/SecurityMonitor";
import Index from "./pages/Index";
import Studio from "./pages/Studio";
import AuthCallback from "./pages/AuthCallback";
import Auth from "./pages/Auth";
import Affiliate from "./pages/Affiliate";
import SellerRegister from "./pages/SellerRegister";
import SellerDashboard from "./pages/SellerDashboard";
import Monetization from "./pages/Monetization";
import Messages from "./pages/Messages";
import CyberGamers from "./pages/CyberGamers";
import CyberStreamer from "./pages/CyberStreamer";
import Connectors from "./pages/Connectors";
import Integrations from "./pages/Integrations";
import SocialHub, { SocialCallbackRedirect } from "./pages/SocialHub";
import Theater from "./pages/Theater";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import StorePage from "./pages/StorePage";
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
import CeoPortal from "./pages/CeoPortal";
import SolarSystemVoyage from "./pages/SolarSystemVoyage";
import Profile from "./pages/Profile";
import LiveRoom from "./pages/LiveRoom";
import Thread from "./pages/Thread";
import Dashboard from "./pages/Dashboard";
import Trading from "./pages/Trading";
import Exchange from "./pages/Exchange";
import Terminal from "./pages/Terminal";
import Moderation from "./pages/Moderation";
import OAuthConsent from "./pages/OAuthConsent";
import Onboarding from "./pages/Onboarding";
import MediaKit from "./pages/MediaKit";
import Advertise from "./pages/Advertise";
import AffiliateRedirect from "./pages/AffiliateRedirect";
import AIBotAssistant from "./components/AIBotAssistant";
import SpaceBackground from "./components/space/SpaceBackground";
import AppShell from "@/components/layout/AppShell";
import { ArenaEntry, ArenaGate, ArenaProfile, ArenaReset } from "@/components/arena/ArenaAccount";
import RequireAuth from "@/components/auth/RequireAuth";
import RouteTitle from "@/components/routing/RouteTitle";
import PendingPolicy from "./pages/PendingPolicy";
import type { ReactNode } from "react";

const ShellRoute = ({ children }: { children: ReactNode }) => <AppShell>{children}</AppShell>;
const PrivateRoute = ({ children }: { children: ReactNode }) => <RequireAuth>{children}</RequireAuth>;

const AppContent = () => {
  return (
    <>
      <SpaceBackground />
      <SecurityMonitor />
      <RouteTitle />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/privacy" element={<PendingPolicy kind="privacy" />} />
        <Route path="/terms" element={<PendingPolicy kind="terms" />} />
        <Route path="/contact" element={<PendingPolicy kind="contact" />} />
        <Route path="/studio" element={<ShellRoute><Studio /></ShellRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/forgot-password" element={<Auth />} />
        <Route path="/reset-password" element={<Auth />} />
        <Route path="/onboarding" element={<ShellRoute><Onboarding /></ShellRoute>} />
        <Route path="/affiliate" element={<ShellRoute><Affiliate /></ShellRoute>} />
        <Route path="/seller-register" element={<ShellRoute><SellerRegister /></ShellRoute>} />
        <Route path="/seller-dashboard" element={<ShellRoute><SellerDashboard /></ShellRoute>} />
        <Route path="/monetization" element={<ShellRoute><Monetization /></ShellRoute>} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/cyber-arena" element={<ArenaEntry />} />
        <Route path="/cyber-arena/login" element={<Auth arena />} />
        <Route path="/cyber-arena/signup" element={<Auth arena />} />
        <Route path="/cyber-arena/forgot-password" element={<Auth arena />} />
        <Route path="/cyber-arena/reset-password" element={<ArenaReset />} />
        <Route path="/cyber-arena/lobby" element={<ArenaGate><CyberGamers /></ArenaGate>} />
        <Route path="/cyber-arena/profile" element={<ArenaGate><ArenaProfile /></ArenaGate>} />
        <Route path="/cyber-arena/*" element={<ArenaGate><NotFound /></ArenaGate>} />
        <Route path="/cyber-streamer" element={<ShellRoute><CyberStreamer /></ShellRoute>} />
        <Route path="/connectors" element={<PrivateRoute><ShellRoute><Connectors /></ShellRoute></PrivateRoute>} />
        <Route path="/connectors/social" element={<PrivateRoute><ShellRoute><SocialHub /></ShellRoute></PrivateRoute>} />
        <Route path="/connectors/social/:provider/callback" element={<SocialCallbackRedirect />} />
        <Route path="/connectors/social/:provider" element={<PrivateRoute><ShellRoute><SocialHub /></ShellRoute></PrivateRoute>} />
        {["accounts","content","analytics","inbox","webhooks","activity","permissions"].map((t) => (
          <Route key={t} path={`/social/${t}`} element={<PrivateRoute><ShellRoute><SocialHub /></ShellRoute></PrivateRoute>} />
        ))}
        <Route path="/integrations" element={<PrivateRoute><ShellRoute><Integrations /></ShellRoute></PrivateRoute>} />
        <Route path="/theater" element={<ShellRoute><Theater /></ShellRoute>} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/store/:slug" element={<StorePage />} />
        <Route path="/security" element={<ShellRoute><Security /></ShellRoute>} />
        <Route path="/community-guidelines" element={<ShellRoute><CommunityGuidelines /></ShellRoute>} />
        <Route path="/verification" element={<ShellRoute><Verification /></ShellRoute>} />
        <Route path="/verification-success" element={<ShellRoute><VerificationSuccess /></ShellRoute>} />
        <Route path="/subscription" element={<ShellRoute><Subscription /></ShellRoute>} />
        <Route path="/affiliate-links" element={<ShellRoute><AffiliateLinks /></ShellRoute>} />
        <Route path="/cyber-world" element={<ShellRoute><CyberWorld /></ShellRoute>} />
        <Route path="/miners" element={<ShellRoute><Miners /></ShellRoute>} />
        <Route path="/profile/:userId" element={<ShellRoute><UserProfile /></ShellRoute>} />
        <Route path="/token-purchase" element={<ShellRoute><TokenPurchase /></ShellRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/live/:streamId" element={<LiveRoom />} />
        <Route path="/post/:postId" element={<Thread />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/exchange" element={<ShellRoute><Exchange /></ShellRoute>} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/moderation" element={<ShellRoute><Moderation /></ShellRoute>} />
        <Route path="/backgrounds" element={<Backgrounds />} />
        <Route path="/ceo" element={<ShellRoute><CeoPortal /></ShellRoute>} />
        <Route path="/voyage" element={<SolarSystemVoyage />} />
        <Route path="/kit/:slug" element={<ShellRoute><MediaKit /></ShellRoute>} />
        <Route path="/advertise" element={<ShellRoute><Advertise /></ShellRoute>} />
        <Route path="/r/:code" element={<AffiliateRedirect />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIBotAssistant />
      <CartSheet />
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
        <BrowserRouter>
          <CartProvider>
          <FloatingWindowsProvider>
            <FourClickCloseWrapper>
              <AppContent />
            </FourClickCloseWrapper>
          </FloatingWindowsProvider>
          </CartProvider>
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
