import LinkedAccountManager from "@/components/accounts/LinkedAccountManager";

/** Trading connections use the same server-managed vault as every connector. */
export const TradingAccountConnect = () => (
  <LinkedAccountManager
    category="trading"
    title="Trading and investment accounts"
    description="Only provider-verified accounts appear connected. Trading and transfers remain disabled unless the provider and permissions are configured."
  />
);