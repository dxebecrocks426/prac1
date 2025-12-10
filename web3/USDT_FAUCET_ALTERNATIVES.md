# USDT Faucet Alternatives

The SPL Token Faucet (https://spl-token-faucet.com) can be unreliable. Here are alternatives for getting USDT tokens for testing.

## For Localnet (Recommended for Development)

### Option 1: Create Your Own USDT Mint (Easiest)

Run the provided script to create a USDT mint and mint tokens to your wallet:

```bash
cd gdx/web3
./scripts/create-usdt-mint.sh
```

This will:
- Create a new USDT mint with 6 decimals (like real USDT)
- Create a token account for your wallet
- Mint 1,000,000 USDT to your wallet
- Save the mint address for future use

**Then update `lib/utils/tokens.ts`:**
```typescript
const USDT_MINT = {
  devnet: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  localnet: "<MINT_ADDRESS_FROM_SCRIPT>", // Update this
};
```

### Option 2: Manual Creation

```bash
# 1. Create mint (6 decimals like USDT)
spl-token create-token --decimals 6

# 2. Note the mint address that's printed

# 3. Create token account
spl-token create-account <MINT_ADDRESS>

# 4. Mint tokens to your wallet
spl-token mint <MINT_ADDRESS> 1000000

# 5. Check balance
spl-token balance <MINT_ADDRESS>
```

## For Devnet

### Option 1: Create Your Own USDT Mint (Recommended - Most Reliable)

Use the provided script to create a USDT mint on devnet:

```bash
cd gdx/web3
./scripts/create-usdt-devnet.sh
```

This will:
- Create a new USDT mint with 6 decimals
- Create a token account for your wallet
- Mint 1,000,000 USDT to your wallet
- Save the mint address for sharing with your team

**Then update `lib/utils/tokens.ts`:**
```typescript
const USDT_MINT = {
  devnet: "<MINT_ADDRESS_FROM_SCRIPT>", // Update this
  mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  localnet: "<YOUR_LOCALNET_MINT>",
};
```

**Team members can mint tokens to their wallets:**
```bash
# They need to create an account first
spl-token create-account <MINT_ADDRESS>

# Then you (or they) can mint tokens to their address
spl-token mint <MINT_ADDRESS> 1000000 <THEIR_WALLET_ADDRESS>
```

### Option 2: Use Existing Devnet USDC (Quick Alternative)

The frontend is configured to use devnet USDC mint (`Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`) as a placeholder. USDC works the same as USDT for testing:

1. **Get USDC from Solana Faucet:**
   - Go to: https://faucet.solana.com
   - Enter your wallet address
   - Request tokens (may provide USDC)

2. **Or use the existing mint:**
   - The mint `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` already exists on devnet
   - Create a token account: `spl-token create-account Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
   - You'll need someone with mint authority to mint tokens to your account

### Option 3: Manual Creation on Devnet

```bash
# Switch to devnet
solana config set --url devnet

# Get SOL (if needed)
solana airdrop 2

# Create mint
spl-token create-token --decimals 6

# Create account and mint
spl-token create-account <MINT_ADDRESS>
spl-token mint <MINT_ADDRESS> 1000000
```

### Option 4: Use Public Devnet Faucets

**Split Pool Mock USDC Faucet** (Recommended - Most Reliable):
- URL: https://www.splitpool.app/faucet
- Provides: Mock USDC tokens on devnet
- Status: Reliable, specifically designed for devnet testing
- Note: Provides USDC (works the same as USDT for testing)

**SPL Token Faucet** (Often Unreliable):
- URL: https://spl-token-faucet.com/?token-name=USDT
- Provides: USDT tokens
- Status: Frequently down or unreliable
- Not recommended as primary option

**Solana Faucet** (May Provide USDC):
- URL: https://faucet.solana.com
- Provides: SOL (sometimes USDC)
- More reliable than SPL Token Faucet

## For Testnet

### Option 1: Create Your Own USDT Mint (Recommended)

Use the provided script:

```bash
cd gdx/web3
./scripts/create-usdt-testnet.sh
```

This will:
- Create a new USDT mint with 6 decimals
- Create a token account for your wallet
- Mint 1,000,000 USDT to your wallet
- Save the mint address for sharing with your team

**Then update `lib/utils/tokens.ts`:**
```typescript
const USDT_MINT = {
  devnet: "<YOUR_DEVNET_MINT>",
  testnet: "<MINT_ADDRESS_FROM_SCRIPT>", // Update this
  mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  localnet: "<YOUR_LOCALNET_MINT>",
};
```

### Option 2: Use Public Testnet Faucets

**SPL Token Faucet**:
- URL: https://spl-token-faucet.com/?token-name=USDT
- Provides: USDT tokens
- Status: Often unreliable
- Network: Testnet

**Solana Faucet**:
- URL: https://faucet.solana.com
- Select "Testnet" network
- Provides: SOL (may provide USDC)
- More reliable than SPL Token Faucet

**QuickNode Testnet Faucet**:
- URL: https://faucet.quicknode.com/solana/testnet
- Provides: SOL only
- Use SOL to create your own mint

**Note:** Testnet is less commonly used than devnet for development. Devnet is recommended for most testing scenarios.

## Alternative Faucets (For SOL Only)

These faucets provide SOL tokens, which you need for transaction fees. They don't provide USDT directly.

### 1. Solana Official Faucet
- **URL**: https://faucet.solana.com
- **Provides**: SOL (sometimes USDC on devnet)
- **Network**: Devnet/Testnet
- **Reliability**: Good
- **Note**: May provide USDC instead of USDT

### 2. QuickNode Faucet
- **URL**: https://faucet.quicknode.com/solana/devnet
- **Provides**: SOL
- **Network**: Devnet
- **Reliability**: Good

### 3. Chainstack Faucet
- **URL**: https://faucet.chainstack.com/solana-devnet-faucet
- **Provides**: SOL
- **Network**: Devnet
- **Reliability**: Good

### 4. SolFaucet
- **URL**: https://solfaucet.com
- **Provides**: SOL
- **Network**: Devnet
- **Reliability**: Variable

**Important**: None of these faucets provide USDT tokens directly. You need to create your own USDT mint (see options above).

## Troubleshooting

### "Token account not found"

Create a token account first:
```bash
spl-token create-account <MINT_ADDRESS>
```

### "Insufficient funds"

Get more SOL:
```bash
# Localnet
solana airdrop 10

# Devnet
solana airdrop 2 --url devnet
```

### "Mint not found"

Make sure you're using the correct mint address and it exists on the network you're connected to.

## Recommended Approach

**For local development:**
1. Use localnet with your own mint (most reliable)
2. Run `./scripts/create-usdt-mint.sh`
3. Update `lib/utils/tokens.ts` with the mint address

**For shared testing:**
1. Deploy to devnet
2. Create a shared USDT mint
3. Share the mint address with your team
4. Each team member can mint tokens to their own wallet

## Minting More Tokens Later

If you need more tokens:

```bash
# Mint additional tokens to your wallet
spl-token mint <MINT_ADDRESS> <AMOUNT> <YOUR_WALLET_ADDRESS>

# Example: Mint 500,000 more USDT
spl-token mint <MINT_ADDRESS> 500000 $(solana address)
```

## Checking Your Token Balance

```bash
# Check balance for a specific mint
spl-token balance <MINT_ADDRESS>

# List all token accounts
spl-token accounts
```

