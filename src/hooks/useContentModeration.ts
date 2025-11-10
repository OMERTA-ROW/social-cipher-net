import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModerationResult {
  is_adult_content: boolean;
  confidence: number;
  flagged_reasons: string[];
}

export const useContentModeration = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const moderateContent = async (
    contentId: string,
    contentType: 'post' | 'stream' | 'product' | 'comment' | 'message',
    contentText?: string,
    contentUrl?: string
  ): Promise<ModerationResult | null> => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          content_id: contentId,
          content_type: contentType,
          content_text: contentText,
          content_url: contentUrl,
        }
      });

      if (error) throw error;

      return data as ModerationResult;
    } catch (error: any) {
      console.error('Content moderation error:', error);
      toast({
        title: "Moderation Error",
        description: "Unable to check content safety. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const checkUserAge = async (): Promise<{ isAdult: boolean; age: number | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdult: false, age: null };

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('birthdate')
        .eq('id', user.id)
        .single();

      if (error || !profile?.birthdate) {
        return { isAdult: false, age: null };
      }

      const birthDate = new Date(profile.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age;

      return {
        isAdult: actualAge >= 18,
        age: actualAge,
      };
    } catch (error) {
      console.error('Age check error:', error);
      return { isAdult: false, age: null };
    }
  };

  const shouldShowContent = async (contentId: string, contentType: string): Promise<boolean> => {
    try {
      // Check if user is an adult
      const { isAdult } = await checkUserAge();

      // Get content moderation status
      const { data: moderation, error } = await supabase
        .from('content_moderation')
        .select('is_adult_content')
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (error || !moderation) {
        // If no moderation record exists, assume safe content
        return true;
      }

      // If content is adult and user is not adult, hide it
      if (moderation.is_adult_content && !isAdult) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Content visibility check error:', error);
      // Default to showing content if check fails
      return true;
    }
  };

  return {
    moderateContent,
    checkUserAge,
    shouldShowContent,
    isChecking,
  };
};