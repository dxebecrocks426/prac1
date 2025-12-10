#!/bin/bash
# Script to create a USDT mint on localnet and mint tokens to your wallet

set -e

echo "🪙 Creating USDT Mint on Localnet"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if spl-token is installed
if ! command -v spl-token &> /dev/null; then
    echo -e "${RED}❌ spl-token CLI not found. Installing...${NC}"
    cargo install spl-token-cli
fi

# Check if validator is running
if ! curl -s http://localhost:8899/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Local validator is not running${NC}"
    echo "   Please start it first: solana-test-validator --reset"
    exit 1
fi

# Set to localnet
solana config set --url localhost > /dev/null 2>&1

# Get wallet address
WALLET=$(solana address)
echo "💰 Wallet: ${WALLET}"

# Check balance
BALANCE=$(solana balance --output json 2>/dev/null | jq -r '.balance // "0"')
echo "💰 SOL Balance: ${BALANCE}"
echo ""

# Create USDT mint (6 decimals like real USDT)
echo "🔨 Creating USDT mint..."
MINT=$(spl-token create-token --decimals 6 2>&1 | grep -oP 'Creating token \K[^\s]+' || echo "")

if [ -z "$MINT" ]; then
    # Try alternative parsing
    MINT=$(spl-token create-token --decimals 6 2>&1 | tail -1 | grep -oP '[A-Za-z0-9]{32,44}' || echo "")
fi

if [ -z "$MINT" ]; then
    echo -e "${RED}❌ Failed to create mint. Output:${NC}"
    spl-token create-token --decimals 6
    exit 1
fi

echo -e "${GREEN}✓ Mint created: ${MINT}${NC}"
echo ""

# Create token account for wallet
echo "📝 Creating token account..."
spl-token create-account "$MINT" 2>&1 | grep -v "Creating" || true
echo -e "${GREEN}✓ Token account created${NC}"
echo ""

# Mint 1,000,000 USDT (with 6 decimals = 1,000,000,000,000 smallest units)
echo "💰 Minting 1,000,000 USDT..."
spl-token mint "$MINT" 1000000 "$WALLET" 2>&1 | grep -v "Minting" || true
echo -e "${GREEN}✓ Tokens minted${NC}"
echo ""

# Check balance
BALANCE=$(spl-token balance "$MINT" 2>/dev/null || echo "0")
echo -e "${GREEN}✅ USDT Balance: ${BALANCE}${NC}"
echo ""

# Save mint address to file
MINT_FILE=".localnet-usdt-mint"
echo "$MINT" > "$MINT_FILE"
echo -e "${GREEN}✓ Mint address saved to ${MINT_FILE}${NC}"
echo ""

echo "📝 Next steps:"
echo "1. Update lib/utils/tokens.ts with this mint address:"
echo "   localnet: \"${MINT}\""
echo ""
echo "2. Restart your frontend to use the new mint"
echo ""
echo "3. Your wallet now has 1,000,000 USDT for testing!"

