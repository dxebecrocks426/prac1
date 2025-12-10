# Localnet Setup Guide for GoDark DEX

This guide will help you set up a local Solana validator with deployed smart contracts so you can test real on-chain transactions.

## Prerequisites

1. **Solana CLI** installed and configured
2. **Anchor** framework installed
3. **Rust** toolchain installed
4. **Node.js** and **bun** for frontend

## Step 1: Start Local Solana Validator

Open a terminal and start a local Solana validator:

```bash
# Start validator with a clean ledger
solana-test-validator --reset

# Keep this terminal running - the validator will run on http://localhost:8899
```

The validator will:
- Create a new keypair at `~/.config/solana/id.json` (if it doesn't exist)
- Fund it with 1,000,000 SOL
- Start RPC on `http://localhost:8899`

## Step 2: Configure Solana CLI for Localnet

In a new terminal:

```bash
# Set Solana CLI to use localnet
solana config set --url localhost

# Verify configuration
solana config get

# Check your balance (should show ~1,000,000 SOL)
solana balance
```

## Step 3: Deploy Collateral Vault Program

Navigate to the collateral vault program:

```bash
cd gdx/contracts/programs/gdx-collateral-vault/collateral-vault
```

### Build the Program

```bash
# Build the Anchor program
anchor build
```

This will:
- Compile the Rust program
- Generate the IDL (Interface Definition Language)
- Create the program binary in `target/deploy/`

### Deploy to Localnet

```bash
# Deploy the program
anchor deploy

# Note the Program ID that gets printed - it should match:
# 6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP
```

If the program ID doesn't match, you'll need to update it in:
- `programs/collateral-vault/src/lib.rs` - `declare_id!()` macro
- `Anchor.toml` - `[programs.localnet]` section

### Verify Deployment

```bash
# Check program is deployed
solana program show 6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP

# Should show program details and data length
```

## Step 4: Set Up USDT Token on Localnet

The SPL Token program is already available on localnet. You need to create a USDT mint:

### Option A: Use Existing Devnet USDT Mint (Easier)

The frontend is already configured to use devnet USDT mint addresses. For localnet, you can:

1. **Create a new mint** (recommended for testing):

```bash
# Create a new SPL token mint
spl-token create-token

# This will output a mint address - save it!
# Example: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

2. **Create token accounts** for your wallet:

```bash
# Get your wallet address
solana address

# Create a token account for the mint
spl-token create-account <MINT_ADDRESS>

# Mint some tokens to your account
spl-token mint <MINT_ADDRESS> 1000000

# Check your token balance
spl-token balance <MINT_ADDRESS>
```

### Option B: Use a Pre-configured Mint

You can also use the devnet USDC mint address (`Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`) but you'll need to create it on localnet first.

## Step 5: Update Frontend Configuration

### Set Environment Variables

Create or update `.env.local` in the `web3` directory:

```bash
cd gdx/web3

# Create .env.local file
cat > .env.local << EOF
# Solana RPC - use localnet
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899

# Collateral Vault Program ID (from deployment)
NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP

# Position Management Program ID (when deployed)
# NEXT_PUBLIC_POSITION_MGMT_PROGRAM_ID=<YOUR_POSITION_MGMT_PROGRAM_ID>
EOF
```

### Update Token Configuration (if you created a custom mint)

If you created a custom USDT mint, update `lib/utils/tokens.ts`:

```typescript
const USDT_MINT = {
  devnet: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  localnet: "<YOUR_LOCALNET_MINT_ADDRESS>", // Update this
};
```

## Step 6: Start Frontend

```bash
cd gdx/web3

# Install dependencies (if not already done)
bun install

# Start development server
bun run dev
```

The frontend will now connect to your local validator.

## Step 7: Connect Wallet and Test

1. **Connect your wallet** (Phantom, Solflare, etc.)
   - Make sure your wallet is connected to **Localnet**
   - In Phantom: Settings → Developer Mode → Change Network → Localhost

2. **Fund your wallet** (if needed):
   ```bash
   # Airdrop SOL to your wallet address
   solana airdrop 10 <YOUR_WALLET_ADDRESS>
   ```

3. **Get USDT tokens**:
   - If you created a custom mint, mint tokens to your wallet
   - Or use the faucet helper in the UI (may need custom setup for localnet)

4. **Authorize USDT**:
   - Click "Authorize USDT" button
   - Enter an amount
   - The transaction should now succeed!

## Troubleshooting

### Transaction Simulation Errors

**Error: "This transaction was reverted during simulation"**

Possible causes:
1. **Program not deployed** - Verify with `solana program show <PROGRAM_ID>`
2. **Wrong program ID** - Check `.env.local` matches deployed program
3. **Insufficient SOL** - Airdrop more SOL: `solana airdrop 10 <ADDRESS>`
4. **Token account doesn't exist** - Create token account first

### Program ID Mismatch

If the deployed program ID doesn't match `6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP`:

1. **Update Anchor.toml**:
   ```toml
   [programs.localnet]
   collateral_vault = "<YOUR_DEPLOYED_PROGRAM_ID>"
   ```

2. **Update lib.rs**:
   ```rust
   declare_id!("<YOUR_DEPLOYED_PROGRAM_ID>");
   ```

3. **Rebuild and redeploy**:
   ```bash
   anchor build
   anchor deploy
   ```

4. **Update frontend .env.local**:
   ```
   NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=<YOUR_DEPLOYED_PROGRAM_ID>
   ```

### Wallet Connection Issues

**Wallet can't connect to localnet:**

1. **Phantom**: Settings → Developer Mode → Change Network → Localhost
2. **Solflare**: Settings → Developer Mode → Custom RPC → `http://localhost:8899`
3. **Backpack**: Settings → Developer → Add Custom Network → `http://localhost:8899`

### Token Account Issues

**"Token account not found" errors:**

```bash
# Create token account for your wallet
spl-token create-account <MINT_ADDRESS>

# Mint tokens
spl-token mint <MINT_ADDRESS> 1000000 <YOUR_WALLET_ADDRESS>
```

## Next Steps

Once localnet is working:

1. **Deploy other programs** (Position Management, Ephemeral Vault, etc.)
2. **Update program IDs** in frontend configuration
3. **Test full flow**: Authorize → Deposit → Trade → Withdraw
4. **Deploy to devnet** for shared testing environment

## Deploying to Devnet/Testnet

When ready to deploy to devnet:

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop SOL
solana airdrop 2

# Deploy
cd gdx/contracts/programs/gdx-collateral-vault/collateral-vault
anchor build
anchor deploy --provider.cluster devnet

# Update frontend .env.local
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=<DEVNET_PROGRAM_ID>
```

## Additional Resources

- [Solana Local Validator Docs](https://docs.solana.com/developing/test-validator)
- [Anchor Deployment Guide](https://www.anchor-lang.com/docs/cli)
- [SPL Token CLI](https://spl.solana.com/token)

