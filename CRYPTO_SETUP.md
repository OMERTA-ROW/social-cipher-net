# Cryptocurrency Wallet Setup Instructions

## WalletConnect Configuration

To enable cryptocurrency wallet connections, you need to set up a WalletConnect project:

### Step 1: Get Your WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID

### Step 2: Update Configuration

Open `src/lib/web3Config.ts` and replace `YOUR_WALLETCONNECT_PROJECT_ID` with your actual Project ID:

```typescript
export const projectId = 'your-actual-project-id-here';
```

## Supported Features

✅ **Multi-Chain Support**
- Ethereum (ETH)
- Polygon (MATIC)
- Binance Smart Chain (BNB)
- Arbitrum
- Optimism
- Base

✅ **Supported Cryptocurrencies**
- Bitcoin (BTC)
- Ethereum (ETH)
- USDC (USD Coin)
- USDT (Tether)
- MATIC (Polygon)
- BNB (Binance Coin)
- And many more...

✅ **Wallet Connection**
- MetaMask
- Coinbase Wallet
- WalletConnect compatible wallets
- Trust Wallet
- Rainbow Wallet

✅ **Features**
- Non-custodial wallet connection (users keep their private keys)
- Accept crypto payments for subscriptions
- Track crypto balances in real-time
- Withdraw earnings in cryptocurrency
- Multi-currency support
- Live USD conversion rates

## How It Works

1. **Connect Wallet**: Users connect their existing crypto wallet (MetaMask, Coinbase, etc.)
2. **Receive Payments**: Accept cryptocurrency for subscriptions, content, and services
3. **Track Balance**: View crypto holdings with live USD values
4. **Withdraw**: Request withdrawals to external wallet addresses

## Security

- All wallets are non-custodial (users control their private keys)
- Transactions are verified on-chain
- No private keys are stored on servers
- Secure WalletConnect protocol

## API Rate Limits

The app uses CoinGecko's free API for price data:
- Rate limit: 10-50 calls/minute (free tier)
- No API key required for basic usage
- Prices update every 30 seconds

For production with high traffic, consider upgrading to CoinGecko Pro API.

## Testing

1. Connect a test wallet (use testnet for development)
2. Test transactions on testnets (Goerli, Mumbai, etc.)
3. Verify balances update correctly
4. Test withdrawal requests

## Production Checklist

- [ ] Add WalletConnect Project ID
- [ ] Test on mainnet with small amounts
- [ ] Set up blockchain RPC endpoints for transaction verification
- [ ] Configure withdrawal processing system
- [ ] Set up monitoring for crypto transactions
- [ ] Add support for additional tokens as needed

## Need Help?

- WalletConnect Docs: https://docs.walletconnect.com
- Wagmi Docs: https://wagmi.sh
- Web3Modal Docs: https://docs.walletconnect.com/web3modal/about
