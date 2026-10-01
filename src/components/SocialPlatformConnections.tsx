import { useEffect } from "react";
import LinkedAccountManager from "@/components/accounts/LinkedAccountManager";
import { useLinkedAccounts } from "@/hooks/useLinkedAccounts";
import { getService } from "@/lib/connectors/registry";

interface Props {
  onConnectionsUpdate?: (platforms: Array<{
    platform: string;
    platform_name: string;
    is_active: boolean;
  }>) => void;
}

/**
 * Social accounts are read only from the server-managed connector model.
 * The retired platform_connections table stored provider secrets in rows the
 * browser could read, so this view deliberately never queries or mutates it.
 */
export const SocialPlatformConnections = ({ onConnectionsUpdate }: Props) => {
  const { accounts, loading } = useLinkedAccounts();

  useEffect(() => {
    if (loading || !onConnectionsUpdate) return;
    onConnectionsUpdate(
      accounts
        .filter((account) => getService(account.service_id)?.category === "social")
        .map((account) => ({
          platform: account.service_id,
          platform_name: getService(account.service_id)?.name ?? account.service_id,
          is_active: account.status === "connected" && account.is_active_account,
        })),
    );
  }, [accounts, loading, onConnectionsUpdate]);

  return (
    <LinkedAccountManager
      category="social"
      title="Social account connections"
      description="Only accounts verified by a configured provider authorization flow appear connected. Earnings and withdrawals are not inferred from social login."
    />
  );
};