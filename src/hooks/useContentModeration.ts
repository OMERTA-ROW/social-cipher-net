import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModerationResult {
  is_adult_content: boolean;
  confidence_score: number;
  flagged_categories: string[];
}

export const useContentModeration = () => {
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkUserAge();
  }, []);

  const checkUserAge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdult(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('birthdate')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile?.birthdate) {
        const birthDate = new Date(profile.birthdate);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        
        // Adjust age if birthday hasn't occurred this year
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        
        setIsAdult(adjustedAge >= 18);
      } else {
        setIsAdult(false);
      }
    } catch (error) {
      console.error('Error checking user age:', error);
      setIsAdult(false);
    } finally {
      setLoading(false);
    }
  };

  const moderateContent = async (
    contentId: string,
    contentType: 'post' | 'stream' | 'product' | 'comment' | 'message',
    contentText?: string,
    contentUrl?: string
  ): Promise<ModerationResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          content_id: contentId,
          content_type: contentType,
          content_text: contentText,
          content_url: contentUrl
        }
      });

      if (error) throw error;

      return {
        is_adult_content: data.is_adult_content,
        confidence_score: data.confidence_score,
        flagged_categories: data.flagged_categories || []
      };
    } catch (error) {
      console.error('Content moderation error:', error);
      toast({
        title: "Moderation Error",
        description: "Failed to moderate content. Please try again.",
        variant: "destructive"
      });
      
      // Default to safe if moderation fails
      return {
        is_adult_content: false,
        confidence_score: 0,
        flagged_categories: []
      };
    }
  };

  const canViewContent = async (contentId: string, contentType: string): Promise<boolean> => {
    if (loading) return false;
    
    // Check if content has been moderated
    const { data: moderation } = await supabase
      .from('content_moderation')
      .select('is_adult_content')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .single();

    // If content is not adult content, everyone can view
    if (!moderation?.is_adult_content) return true;

    // If content is adult, only adults can view
    return isAdult === true;
  };

  return {
    isAdult,
    loading,
    moderateContent,
    canViewContent,
    checkUserAge
  };
};