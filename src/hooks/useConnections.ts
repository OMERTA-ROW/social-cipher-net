import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserConnection {
  id: string;
  service_id: string;
  method: string;
  status: string;
  account_name: string | null;
  account_handle: string | null;
  metadata: Record<string, unknown> | null;
  last_error: string | null;
  health: string | null;
  expires_at: string | null;
  last_synced_at: string | null;
  scopes: string[] | null;
  failure_count: number | null;
  connected_at: string;
  updated_at: string;
}

/**
 * The signed-in user's external service connections. Only status and account
 * labels ever reach the browser — keys and tokens stay server-side.
 */
export const useConnections = () => {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_connections")
      .select(
        "id, service_id, method, status, account_name, account_handle, metadata, last_error, health, expires_at, last_synced_at, scopes, failure_count, connected_at, updated_at",
      )
      .eq("user_id", user.id);
    setConnections((data ?? []) as UserConnection[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const byService = (serviceId: string) =>
    connections.find((c) => c.service_id === serviceId && c.status === "connected") ??
    connections.find((c) => c.service_id === serviceId) ?? null;

  const isConnected = (serviceId: string) =>
    byService(serviceId)?.status === "connected";

  return { connections, loading, userId, refresh: load, byService, isConnected };
};
