import { isVerifiedConnection } from "@/lib/integrationStatus";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserConnection {
  id: string;
  service_id: string;
  method: string;
  status: string;
  account_name: string | null;
  account_handle: string | null;
  provider_account_id?: string | null;
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
 * Stale responses (from a previous user or an older request) are discarded.
 */
export const useConnections = () => {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const isCurrent = () => request === requestRef.current;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isCurrent()) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setConnections([]);
        setError(null);
        return;
      }
      const { data, error: dbError } = await supabase
        .from("user_connections")
        .select(
          "id, service_id, method, status, account_name, account_handle, provider_account_id, metadata, last_error, health, expires_at, last_synced_at, scopes, failure_count, connected_at, updated_at",
        )
        .eq("user_id", user.id);
      if (!isCurrent()) return;
      if (dbError) {
        setConnections([]);
        setError("Connections could not be loaded.");
        return;
      }
      setConnections((data ?? []) as UserConnection[]);
      setError(null);
    } catch {
      if (!isCurrent()) return;
      setConnections([]);
      setError("Connections could not be loaded.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Clear immediately on sign-out/switch so no previous user's rows linger.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setConnections([]);
        setLoading(true);
      }
      load();
    });
    return () => {
      requestRef.current++;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const byService = (serviceId: string) =>
    connections.find((c) => c.service_id === serviceId && c.status === "connected") ??
    connections.find((c) => c.service_id === serviceId) ?? null;

  const isConnected = (serviceId: string) =>
    isVerifiedConnection(byService(serviceId));

  return { connections, loading, error, userId, refresh: load, byService, isConnected };
};
