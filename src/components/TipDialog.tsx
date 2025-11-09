import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface TipDialogProps {
  creatorName: string;
}

const TipForm = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [amount, setAmount] = useState("5.00");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tip Sent!",
          description: `Thank you for supporting ${creatorName}!`,
        });
        onClose();
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Tip Amount ($)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum: $0.50</p>
      </div>

      <div>
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea
          id="message"
          placeholder="Send a message to the creator..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      <PaymentElement />

      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4 mr-2" />
            Send ${parseFloat(amount).toFixed(2)} Tip
          </>
        )}
      </Button>
    </form>
  );
};

export const TipDialog = ({ creatorName }: TipDialogProps) => {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (isOpen && !clientSecret) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-tip", {
          body: {
            amount: 500, // $5.00 default
            creatorName,
            message: "",
          },
        });

        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Error creating tip:", error);
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="w-4 h-4 mr-2" />
          Send Tip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a Tip to {creatorName}</DialogTitle>
          <DialogDescription>
            Support your favorite creator with a tip!
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <TipForm creatorName={creatorName} onClose={() => setOpen(false)} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
