import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaleData {
  product_id: string;
  seller_id: string;
  affiliate_id?: string;
  buyer_email: string;
  amount: number;
  shipping_cost?: number;
}

interface SaleResult {
  success: boolean;
  sale_id?: string;
  platform_commission?: number;
  seller_commission?: number;
  affiliate_commission?: number;
}

export const useSaleProcessing = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const processSale = async (saleData: SaleData): Promise<SaleResult> => {
    setLoading(true);
    try {
      console.log('Processing sale with 2% platform commission:', saleData);

      const { data, error } = await supabase.functions.invoke('process-sale', {
        body: saleData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sale Processed",
          description: `Platform commission: $${data.platform_commission.toFixed(2)} (2%)`,
        });

        console.log('Sale completed:', {
          sale_id: data.sale_id,
          platform_commission: data.platform_commission,
          seller_commission: data.seller_commission,
          affiliate_commission: data.affiliate_commission
        });
      }

      return {
        success: data.success,
        sale_id: data.sale_id,
        platform_commission: data.platform_commission,
        seller_commission: data.seller_commission,
        affiliate_commission: data.affiliate_commission
      };
    } catch (error) {
      console.error('Sale processing error:', error);
      toast({
        title: "Sale Failed",
        description: "Failed to process sale. Please try again.",
        variant: "destructive"
      });
      
      return {
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    processSale,
    loading
  };
};
