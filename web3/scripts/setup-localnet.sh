#!/bin/bash
# Quick setup script for localnet development
# This script helps set up a local Solana validator with deployed contracts

set -e

echo "🚀 GoDark Localnet Setup Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install it first:${NC}"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found. Please install it first:${NC}"
    echo "   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "   avm install latest && avm use latest"
    exit 1
fi

# Check if spl-token CLI is installed
if ! command -v spl-token &> /dev/null; then
    echo -e "${YELLOW}⚠️  SPL Token CLI not found. Installing...${NC}"
    cargo install spl-token-cli
fi

echo -e "${GREEN}✓ All required tools are installed${NC}"
echo ""

# Set Solana config to localnet
echo "📝 Configuring Solana CLI for localnet..."
solana config set --url localhost
echo -e "${GREEN}✓ Solana CLI configured for localnet${NC}"
echo ""

# Check if validator is running
echo "🔍 Checking if local validator is running..."
if curl -s http://localhost:8899/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Local validator is running${NC}"
else
    echo -e "${YELLOW}⚠️  Local validator is not running${NC}"
    echo ""
    echo "Please start the validator in a separate terminal:"
    echo "   solana-test-validator --reset"
    echo ""
    read -p "Press Enter when validator is running, or Ctrl+C to exit..."
fi
echo ""

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo "💰 Wallet Address: ${WALLET_ADDRESS}"

# Check balance
BALANCE=$(solana balance --output json | jq -r '.balance')
echo "💰 Balance: ${BALANCE} SOL"
echo ""

# Navigate to collateral vault directory
VAULT_DIR="../../contracts/programs/gdx-collateral-vault/collateral-vault"
if [ ! -d "$VAULT_DIR" ]; then
    echo -e "${RED}❌ Collateral vault directory not found at: ${VAULT_DIR}${NC}"
    echo "   Please run this script from gdx/web3/scripts/"
    exit 1
fi

cd "$VAULT_DIR"

# Build the program
echo "🔨 Building collateral vault program..."
anchor build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Deploy the program
echo "🚀 Deploying collateral vault program to localnet..."
anchor deploy
echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# Get deployed program ID
PROGRAM_ID=$(solana program show --output json 2>/dev/null | jq -r '.[0].programId' || echo "")
if [ -z "$PROGRAM_ID" ]; then
    # Try alternative method
    PROGRAM_ID=$(grep -oP 'collateral_vault = "\K[^"]+' Anchor.toml || echo "")
fi

if [ -n "$PROGRAM_ID" ]; then
    echo -e "${GREEN}✓ Program ID: ${PROGRAM_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  Could not determine program ID. Please check Anchor.toml${NC}"
fi
echo ""

# Go back to web3 directory
cd - > /dev/null

# Create or update .env.local
ENV_FILE=".env.local"
echo "📝 Updating ${ENV_FILE}..."

if [ -f "$ENV_FILE" ]; then
    # Update existing file
    if grep -q "NEXT_PUBLIC_SOLANA_RPC_URL" "$ENV_FILE"; then
        sed -i.bak "s|NEXT_PUBLIC_SOLANA_RPC_URL=.*|NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899|" "$ENV_FILE"
    else
        echo "NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899" >> "$ENV_FILE"
    fi

    if [ -n "$PROGRAM_ID" ]; then
        if grep -q "NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID" "$ENV_FILE"; then
            sed -i.bak "s|NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=.*|NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=${PROGRAM_ID}|" "$ENV_FILE"
        else
            echo "NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=${PROGRAM_ID}" >> "$ENV_FILE"
        fi
    fi
else
    # Create new file
    cat > "$ENV_FILE" << EOF
# Solana RPC - Localnet
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899

# Collateral Vault Program ID
NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=${PROGRAM_ID:-6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP}
EOF
fi

echo -e "${GREEN}✓ ${ENV_FILE} updated${NC}"
echo ""

# Create USDT mint helper
echo "🪙 To create a USDT mint on localnet, run:"
echo "   spl-token create-token"
echo "   spl-token create-account <MINT_ADDRESS>"
echo "   spl-token mint <MINT_ADDRESS> 1000000"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the frontend: bun run dev"
echo "2. Connect your wallet to localnet"
echo "3. Create a USDT mint (see commands above)"
echo "4. Test authorization in the UI"
echo ""
echo "For detailed instructions, see: LOCALNET_SETUP.md"

