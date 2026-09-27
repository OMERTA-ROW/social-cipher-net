import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CyberLinkBrainDashboard from "@/components/CyberLinkBrainDashboard";
import PlatformRevenueDashboard from "@/components/admin/PlatformRevenueDashboard";
import { useIsCeo } from "@/hooks/useIsCeo";

/**
 * CEO / owner-only portal. Houses CyberLink Brain AI. Non-owner accounts are
 * redirected away and never see that the area exists.
 */
const CeoPortal = () => {
  const { isCeo, loading } = useIsCeo();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCeo) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <PlatformRevenueDashboard />
        <CyberLinkBrainDashboard />
      </div>
    </div>
  );
};

export default CeoPortal;
