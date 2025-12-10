#!/bin/bash
# Script to create a USDT mint on testnet and mint tokens to your wallet

set -e

echo "🪙 Creating USDT Mint on Testnet"
echo "================================="
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

# Set to testnet
echo "📝 Configuring for testnet..."
solana config set --url testnet

# Get wallet address
WALLET=$(solana address)
echo "💰 Wallet: ${WALLET}"

# Check balance
BALANCE=$(solana balance --output json 2>/dev/null | jq -r '.balance // "0"')
echo "💰 SOL Balance: ${BALANCE} SOL"

# Check if we have enough SOL
if (( $(echo "$BALANCE < 0.1" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low SOL balance. Requesting airdrop...${NC}"
    solana airdrop 2
    sleep 2
    BALANCE=$(solana balance --output json 2>/dev/null | jq -r '.balance // "0"')
    echo "💰 New SOL Balance: ${BALANCE} SOL"
fi

echo ""

# Create USDT mint (6 decimals like real USDT)
echo "🔨 Creating USDT mint on testnet..."
MINT_OUTPUT=$(spl-token create-token --decimals 6 2>&1)
MINT=$(echo "$MINT_OUTPUT" | grep -oP 'Creating token \K[A-Za-z0-9]{32,44}' || echo "")

if [ -z "$MINT" ]; then
    # Try alternative parsing - get the last line that looks like a pubkey
    MINT=$(echo "$MINT_OUTPUT" | grep -oE '[A-Za-z0-9]{32,44}' | tail -1 || echo "")
fi

if [ -z "$MINT" ]; then
    echo -e "${RED}❌ Failed to create mint. Output:${NC}"
    echo "$MINT_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Mint created: ${MINT}${NC}"
echo ""

# Wait a moment for the mint to be confirmed
sleep 2

# Create token account for wallet
echo "📝 Creating token account..."
ACCOUNT_OUTPUT=$(spl-token create-account "$MINT" 2>&1)
echo "$ACCOUNT_OUTPUT" | grep -v "Creating" || true
echo -e "${GREEN}✓ Token account created${NC}"
echo ""

# Wait a moment
sleep 2

# Mint 1,000,000 USDT (with 6 decimals)
echo "💰 Minting 1,000,000 USDT..."
MINT_OUTPUT=$(spl-token mint "$MINT" 1000000 2>&1)
echo "$MINT_OUTPUT" | grep -v "Minting" || true
echo -e "${GREEN}✓ Tokens minted${NC}"
echo ""

# Wait for confirmation
sleep 2

# Check balance
BALANCE=$(spl-token balance "$MINT" 2>/dev/null || echo "0")
echo -e "${GREEN}✅ USDT Balance: ${BALANCE}${NC}"
echo ""

# Save mint address to file
MINT_FILE=".testnet-usdt-mint"
echo "$MINT" > "$MINT_FILE"
echo -e "${GREEN}✓ Mint address saved to ${MINT_FILE}${NC}"
echo ""

echo "📝 Next steps:"
echo "1. Update lib/utils/tokens.ts with this mint address:"
echo "   testnet: \"${MINT}\""
echo ""
echo "2. Share this mint address with your team:"
echo "   ${MINT}"
echo ""
echo "3. Team members can mint tokens to their wallets:"
echo "   spl-token create-account ${MINT}"
echo "   spl-token mint ${MINT} 1000000 <THEIR_WALLET_ADDRESS>"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"

