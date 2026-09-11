import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Scan, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PoolConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolId: string;
  onConsentComplete: () => void;
}

export const PoolConsentDialog = ({ open, onOpenChange, poolId, onConsentComplete }: PoolConsentDialogProps) => {
  const [verifying, setVerifying] = useState(false);
  const [verificationType, setVerificationType] = useState<'face' | 'fingerprint' | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  const startVerification = async (type: 'face' | 'fingerprint') => {
    setVerificationType(type);
    setVerificationStatus('scanning');
    setVerifying(true);

    // Real device biometric check: the browser asks the built-in authenticator
    // (Face ID / Touch ID / Windows Hello) to confirm the person is present.
    let success = false;
    try {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!current) throw new Error("Please sign in first.");
      if (!window.PublicKeyCredential || !navigator.credentials?.create) {
        throw new Error("This device or browser cannot do biometric verification.");
      }
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Cyber Link", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(current.user.id),
            name: current.user.email ?? current.user.id,
            displayName: current.user.email ?? "Cyber Link member",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60_000,
        },
      });
      success = Boolean(credential);
    } catch (error: unknown) {
      success = false;
      const message = error instanceof Error ? error.message : "Verification was not completed.";
      toast.error(message);
    }

    if (success) {
      setVerificationStatus('success');
      
      // Record consent in database
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const { error } = await supabase
          .from('pool_consent')
          .insert({
            user_id: session.user.id,
            pool_id: poolId,
            consent_given: true,
            consent_type: type === 'face' ? 'face_recognition' : 'fingerprint',
            verification_data: {
              timestamp: new Date().toISOString(),
              method: type,
              device: navigator.userAgent
            }
          });

        if (error) throw error;

        toast.success(`${type === 'face' ? 'Face' : 'Fingerprint'} verification successful!`);
        
        setTimeout(() => {
          onConsentComplete();
          onOpenChange(false);
          resetState();
        }, 1500);
      } catch (error: any) {
        console.error('Consent recording error:', error);
        setVerificationStatus('failed');
        toast.error("Failed to record consent");
        setVerifying(false);
      }
    } else {
      setVerificationStatus('failed');
      toast.error("Verification failed. Please try again.");
      setTimeout(() => {
        setVerifying(false);
        setVerificationStatus('idle');
      }, 2000);
    }
  };

  const resetState = () => {
    setVerifying(false);
    setVerificationType(null);
    setVerificationStatus('idle');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Identity Verification Required
          </DialogTitle>
          <DialogDescription>
            To join this token pool, you must verify your identity using face recognition or fingerprint to consent to token dispersion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {verificationStatus === 'idle' && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={() => startVerification('face')}
                disabled={verifying}
              >
                <Scan className="w-12 h-12 text-primary" />
                <span>Face Recognition</span>
              </Button>

              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={() => startVerification('fingerprint')}
                disabled={verifying}
              >
                <Fingerprint className="w-12 h-12 text-primary" />
                <span>Fingerprint</span>
              </Button>
            </div>
          )}

          {verificationStatus === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {verificationType === 'face' ? (
                <Scan className="w-24 h-24 text-primary animate-pulse" />
              ) : (
                <Fingerprint className="w-24 h-24 text-primary animate-pulse" />
              )}
              <p className="text-lg font-medium">Scanning...</p>
              <p className="text-sm text-muted-foreground">
                {verificationType === 'face' ? 'Please look at the camera' : 'Place your finger on the sensor'}
              </p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="w-24 h-24 text-green-500" />
              <p className="text-lg font-medium text-green-500">Verification Successful!</p>
              <p className="text-sm text-muted-foreground">Consent recorded</p>
            </div>
          )}

          {verificationStatus === 'failed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <XCircle className="w-24 h-24 text-red-500" />
              <p className="text-lg font-medium text-red-500">Verification Failed</p>
              <p className="text-sm text-muted-foreground">Please try again</p>
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Scan className="w-4 h-4" />
            Why is this required?
          </p>
          <p className="text-xs text-muted-foreground">
            Biometric verification ensures all participants consent to token pool participation and token dispersion, preventing fraud and ensuring fair play.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
