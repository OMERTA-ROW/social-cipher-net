import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedTab {
  id: string;
  user_id: string;
  tab_name: string;
  tab_url: string;
  tab_type: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useSavedTabs = () => {
  const queryClient = useQueryClient();

  const { data: savedTabs, isLoading } = useQuery({
    queryKey: ["saved-tabs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_saved_tabs")
        .select("id, user_id, tab_name, tab_url, tab_type, is_active, metadata, created_at, updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SavedTab[];
    },
  });

  const saveTab = useMutation({
    mutationFn: async (tab: { tab_name: string; tab_url: string; tab_type?: string; metadata?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_saved_tabs")
        .insert({
          user_id: user.id,
          tab_name: tab.tab_name,
          tab_url: tab.tab_url,
          tab_type: tab.tab_type || "trading_platform",
          metadata: tab.metadata || {},
        })
        .select("id, user_id, tab_name, tab_url, tab_type, is_active, metadata, created_at, updated_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-tabs"] });
      toast.success("Tab saved! Now accessible across CyberLink.");
    },
    onError: (error) => {
      toast.error("Failed to save tab: " + error.message);
    },
  });

  const deleteTab = useMutation({
    mutationFn: async (tabId: string) => {
      const { error } = await supabase
        .from("user_saved_tabs")
        .delete()
        .eq("id", tabId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-tabs"] });
      toast.success("Tab removed");
    },
    onError: (error) => {
      toast.error("Failed to remove tab: " + error.message);
    },
  });

  const updateTabCredentials = useMutation({
    mutationFn: async ({ tabId, credentials }: { tabId: string; credentials: Record<string, any> }) => {
      const { error } = await supabase
        .from("user_saved_tabs")
        .update({ login_credentials: credentials })
        .eq("id", tabId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-tabs"] });
      toast.success("Login credentials saved");
    },
    onError: (error) => {
      toast.error("Failed to save credentials: " + error.message);
    },
  });

  return {
    savedTabs: savedTabs || [],
    isLoading,
    saveTab: saveTab.mutate,
    deleteTab: deleteTab.mutate,
    updateTabCredentials: updateTabCredentials.mutate,
  };
};
