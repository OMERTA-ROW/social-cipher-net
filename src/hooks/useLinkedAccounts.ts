import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LinkedAccount {
  id: string;
  service_id: string;
  account_key: string;
  account_label: string | null;
  is_active_account: boolean;
  method: string;
  status: string;
  health: string | null;
  account_name: string | null;
  account_handle: string | null;
  last_error: string | null;
  provider_account_id: string | null;
  last_synced_at: string | null;
  expires_at: string | null;
  connected_at: string;
}

/**
 * Every account the signed-in member has linked, one row per account rather
 * than one per provider. Only labels and status reach the browser — keys and
 * tokens live encrypted on the server and are never selected here.
 */
export const useLinkedAccounts = () => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_connections")
      .select(
        "id, service_id, account_key, account_label, is_active_account, method, status, health, account_name, account_handle, last_error, last_synced_at, expires_at, connected_at",
      )
      .eq("user_id", user.id)
      .order("service_id", { ascending: true })
      .order("is_active_account", { ascending: false });
    setAccounts((data ?? []) as LinkedAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const forService = useCallback(
    (serviceId: string) => accounts.filter((a) => a.service_id === serviceId),
    [accounts],
  );

  const activeFor = useCallback(
    (serviceId: string) =>
      accounts.find((a) => a.service_id === serviceId && a.is_active_account) ?? null,
    [accounts],
  );

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("connector-credentials", { body });
      if (error) throw new Error(error.message);
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }
      await load();
      return data;
    },
    [load],
  );

  const setActive = (serviceId: string, connectionId: string) =>
    call({ action: "set_active", service_id: serviceId, connection_id: connectionId });

  const rename = (serviceId: string, connectionId: string, label: string) =>
    call({ action: "rename", service_id: serviceId, connection_id: connectionId, account_label: label });

  const disconnect = (serviceId: string, connectionId: string) =>
    call({ action: "disconnect", service_id: serviceId, connection_id: connectionId });

  return { accounts, loading, userId, refresh: load, forService, activeFor, setActive, rename, disconnect };
};
