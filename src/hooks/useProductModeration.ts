import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModerationResult {
  success: boolean;
  blocked: boolean;
  reason?: string;
  violation_type?: string[];
  confidence_score?: number;
}

export const useProductModeration = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const moderateProduct = async (
    productId: string,
    title: string,
    description?: string,
    category?: string,
    imageUrl?: string
  ): Promise<ModerationResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-product', {
        body: {
          product_id: productId,
          title,
          description,
          category,
          image_url: imageUrl
        }
      });

      if (error) throw error;

      if (data.blocked) {
        toast({
          title: "Product Blocked",
          description: data.reason || "This product violates our policies and cannot be listed.",
          variant: "destructive"
        });
      }

      return {
        success: data.success,
        blocked: data.blocked || false,
        reason: data.reason,
        violation_type: data.violation_type,
        confidence_score: data.confidence_score || 0
      };
    } catch (error) {
      console.error('Product moderation error:', error);
      toast({
        title: "Moderation Error",
        description: "Failed to moderate product. Please try again.",
        variant: "destructive"
      });
      
      return {
        success: false,
        blocked: false,
        confidence_score: 0
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    moderateProduct,
    loading
  };
};
