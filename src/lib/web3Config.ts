import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { cookieStorage, createStorage } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, bsc } from 'wagmi/chains';

/**
 * WalletConnect Project ID.
 * This is a public client-side identifier (not a secret); it lives in env
 * config so it can be rotated without touching source.
 */
const ENV_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim();

// Fallback is intentional: this public identifier must survive builds where the
// env var is not injected, otherwise Web3Modal initialises with an empty id and
// renders an empty dialog.
const FALLBACK_PROJECT_ID = 'e4559d53201f9edfee6b623706d47138';

const PLACEHOLDER_IDS = ['YOUR_WALLETCONNECT_PROJECT_ID', ''];

export const projectId =
  ENV_PROJECT_ID && !PLACEHOLDER_IDS.includes(ENV_PROJECT_ID)
    ? ENV_PROJECT_ID
    : FALLBACK_PROJECT_ID;

export const isWalletConnectConfigured = !PLACEHOLDER_IDS.includes(projectId);

export const PRODUCTION_URL = 'https://cyberlink.social';

const metadata = {
  name: 'Cyber Link Social',
  description: 'Social platform with crypto payments',
  url: typeof window !== 'undefined' ? window.location.origin : PRODUCTION_URL,
  icons: [`${PRODUCTION_URL}/wallet-icon.png`],
};

export const config = defaultWagmiConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base, bsc],
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  }),
});

export const SUPPORTED_CHAINS = [
  { id: mainnet.id, name: 'Ethereum', symbol: 'ETH' },
  { id: polygon.id, name: 'Polygon', symbol: 'MATIC' },
  { id: arbitrum.id, name: 'Arbitrum', symbol: 'ETH' },
  { id: optimism.id, name: 'Optimism', symbol: 'ETH' },
  { id: base.id, name: 'Base', symbol: 'ETH' },
  { id: bsc.id, name: 'BSC', symbol: 'BNB' },
];

export const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { symbol: 'USDT', name: 'Tether', decimals: 6 },
  { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
  { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
  { symbol: 'BNB', name: 'Binance Coin', decimals: 18 },
];
