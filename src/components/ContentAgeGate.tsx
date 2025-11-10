import { ReactNode } from "react";
import { useContentModeration } from "@/hooks/useContentModeration";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface ContentAgeGateProps {
  contentId: string;
  contentType: 'post' | 'stream' | 'product' | 'comment' | 'message';
  children: ReactNode;
  fallback?: ReactNode;
}

export const ContentAgeGate = ({ 
  contentId, 
  contentType, 
  children,
  fallback 
}: ContentAgeGateProps) => {
  const { isAdult, loading, canViewContent } = useContentModeration();
  const [canView, setCanView] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkAccess = async () => {
      const allowed = await canViewContent(contentId, contentType);
      setCanView(allowed);
    };
    
    if (!loading) {
      checkAccess();
    }
  }, [loading, contentId, contentType]);

  if (loading || canView === null) {
    return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  }

  if (!canView && isAdult === false) {
    return fallback || (
      <Alert variant="destructive" className="my-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Age-Restricted Content</AlertTitle>
        <AlertDescription>
          This content contains adult nudity and is only available to users 18 years or older.
          All other content types (violence, profanity, etc.) are unrestricted.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

// React import for useState/useEffect
import * as React from "react";