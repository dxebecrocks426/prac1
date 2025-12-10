# Requirements Alignment with gdx/README.md

This document outlines how the web3 frontend implementation aligns with the requirements specified in `gdx/README.md`.

## Wallet Connection Requirements

### ✅ Implemented

1. **Connect Existing Wallets**
   - ✅ Phantom wallet adapter
   - ✅ Solflare wallet adapter
   - ✅ Trust wallet adapter
   - ✅ Wallet selection modal via `@solana/wallet-adapter-react-ui`

2. **Wallet Display**
   - ✅ Shows connected wallet address (truncated)
   - ✅ Displays SOL balance
   - ✅ Displays USDT balance (when available)
   - ✅ Disconnect functionality

3. **UI Components**
   - ✅ Wallet connection button in header
   - ✅ Clear messaging: "Connect a wallet on Solana to continue"
   - ✅ Responsive design with shadcn/ui components

### 🚧 Partially Implemented (UI Ready, Backend Integration Pending)

1. **Authorize GoDark**
   - ✅ UI button: "Authorize USDT"
   - ⚠️ Placeholder implementation (needs Anchor program integration)
   - **Required**: Delegate approval flow for USDT spending
   - **Next Steps**: Integrate with `gdx-collateral-vault` program's delegate approval

2. **Withdraw Unlocked Balance**
   - ✅ UI button: "Withdraw"
   - ⚠️ Placeholder implementation (needs Anchor program integration)
   - **Required**: Call `withdraw` instruction on collateral vault program
   - **Next Steps**: Integrate with `gdx-collateral-vault` program

3. **Revoke Wallet Access**
   - ✅ UI button: "Revoke"
   - ⚠️ Placeholder implementation (needs Anchor program integration)
   - **Required**: Revoke delegate approval for USDT
   - **Next Steps**: Implement SPL Token delegate revocation

### ❌ Not Implemented (Requires Backend Services)

1. **Create New Wallet Options**
   - ❌ Sign in with Google/Apple/X/Discord
   - ❌ Email-based wallet creation
   - **Reason**: Requires backend authentication service and wallet generation service
   - **Note**: This is typically handled by third-party services (e.g., Magic, Web3Auth)

## Smart Contract Integration Requirements

### Program IDs (from documentation)

- **Collateral Vault**: `CollVault111111111111111111111111111111111`
- **Position Management**: `PosMgmt111111111111111111111111111111111`
- **Ephemeral Vault**: (TBD)

### Required Integrations

1. **Collateral Vault Program**
   - ⚠️ Initialize vault (`initialize_vault`)
   - ⚠️ Deposit USDT (`deposit`)
   - ⚠️ Withdraw USDT (`withdraw`)
   - ⚠️ Check vault state (PDA: `[b"vault", user.key()]`)

2. **Position Management Program**
   - ⚠️ Open position (`open_position`)
   - ⚠️ Close position (`close_position`)
   - ⚠️ View positions (PDA: `[b"position", owner.key(), symbol.as_bytes()]`)

3. **USDT Token Operations**
   - ✅ USDT balance fetching (via SPL Token)
   - ⚠️ Delegate approval (needs implementation)
   - ⚠️ Revoke delegate (needs implementation)

## UI/UX Requirements Alignment

### ✅ Implemented

1. **Header**
   - ✅ GoDark DEX branding
   - ✅ Wallet connection button

2. **Main Page**
   - ✅ Welcome message
   - ✅ Card-based layout for Trade, Portfolio, Markets
   - ✅ Responsive design

### 🚧 Next Steps (Per README Requirements)

1. **Trade Page** (Main page on app.godark.xyz)
   - ⚠️ Funding rate stats and countdown at header
   - ⚠️ Order form
   - ⚠️ Chart with symbol selector
   - ⚠️ Orderbook display

2. **Trade Tables**
   - ⚠️ Working Orders table
   - ⚠️ Order History table
   - ⚠️ Open Positions table

3. **Additional Pages**
   - ⚠️ Stats (pop-up modal)
   - ⚠️ Referrals (pop-up modal)
   - ⚠️ Settings (pop-up modal)
   - ⚠️ Docs (separate page)

## Technical Stack Alignment

### ✅ Implemented

- ✅ Next.js 16+ (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ `@solana/web3.js`
- ✅ `@solana/wallet-adapter-react`
- ✅ `@solana/wallet-adapter-react-ui`
- ✅ `@solana/wallet-adapter-wallets`
- ✅ `@solana/spl-token`

### ⚠️ Pending

- ⚠️ `@coral-xyz/anchor` (installed but not yet integrated)
- ⚠️ Anchor program IDL integration
- ⚠️ WebSocket integration for real-time data
- ⚠️ API integration (REST endpoints)

## Environment Configuration

### ✅ Implemented

- ✅ RPC endpoint configuration via `NEXT_PUBLIC_SOLANA_RPC_URL`
- ✅ Support for localhost, devnet, mainnet
- ✅ USDT mint address detection based on network

### 📝 Recommended `.env.local`

```env
# Solana RPC Endpoint
# For local development: http://localhost:8899
# For devnet: https://api.devnet.solana.com
# For mainnet: https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899

# Program IDs (when available)
NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID=CollVault111111111111111111111111111111111
NEXT_PUBLIC_POSITION_MGMT_PROGRAM_ID=PosMgmt111111111111111111111111111111111
```

## Summary

### Current Status

✅ **Foundation Complete**
- Next.js project setup
- Wallet connection infrastructure
- UI components (shadcn/ui)
- Basic wallet display and balance fetching

🚧 **Ready for Integration**
- UI components for authorization, withdraw, revoke are in place
- Need Anchor program integration to complete functionality

❌ **Pending Backend Services**
- Create wallet options (Google/Apple/X/Discord/Email)
- Requires authentication and wallet generation services

### Next Steps

1. **Immediate**: Integrate Anchor programs
   - Load IDL files from `target/idl/` directories
   - Implement `initialize_vault` instruction
   - Implement `deposit` and `withdraw` instructions
   - Implement delegate approval flow

2. **Short-term**: Complete wallet flow
   - USDT authorization with amount input
   - Withdraw unlocked balance functionality
   - Revoke delegate functionality

3. **Medium-term**: Trading interface
   - Order placement UI
   - Position management UI
   - Market data display
   - Real-time WebSocket integration

4. **Long-term**: Additional features
   - Create wallet options (requires backend)
   - Stats, Referrals, Settings modals
   - Documentation page


