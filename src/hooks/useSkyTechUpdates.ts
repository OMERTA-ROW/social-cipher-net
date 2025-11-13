import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppUpdate {
  id: string;
  title: string;
  description: string;
  update_type: string;
  version: string;
  is_applied: boolean;
  auto_apply: boolean;
}

export const useSkyTechUpdates = () => {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkForUpdates();

    // Set up realtime subscription for new updates
    const channel = supabase
      .channel('skytech-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'skytech_app_updates'
        },
        (payload) => {
          const newUpdate = payload.new as AppUpdate;
          setUpdates(prev => [newUpdate, ...prev]);
          setHasNewUpdates(true);

          if (newUpdate.auto_apply) {
            autoApplyUpdate(newUpdate.id);
          } else {
            toast({
              title: "New Update Available",
              description: newUpdate.title,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('skytech-auto-update', {
        body: { action: 'check_updates' }
      });

      if (error) throw error;

      setUpdates(data.updates || []);
      setHasNewUpdates(data.updates?.some((u: AppUpdate) => !u.is_applied) || false);
    } catch (error: any) {
      console.error('Failed to check updates:', error);
    }
  };

  const autoApplyUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase.functions.invoke('skytech-auto-update', {
        body: { action: 'apply_update', update_id: updateId }
      });

      if (error) throw error;

      toast({
        title: "Auto-Update Applied",
        description: "The app has been updated automatically",
      });

      checkForUpdates();
    } catch (error: any) {
      console.error('Auto-update failed:', error);
    }
  };

  return {
    updates,
    hasNewUpdates,
    checkForUpdates,
  };
};
