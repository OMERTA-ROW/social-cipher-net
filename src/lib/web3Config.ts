import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { cookieStorage, createStorage } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, bsc } from 'wagmi/chains';

export const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'; // Users will need to get this from cloud.walletconnect.com

const metadata = {
  name: 'CyberLink Social',
  description: 'Social platform with crypto payments',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
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
