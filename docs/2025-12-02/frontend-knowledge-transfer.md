# Knowledge Transfer: GoDark Frontend Development

**Date:** December 2, 2025
**Context:** This document provides context for transitioning from Solana smart contract development to frontend development.

---

## 1. System Overview

GoDark is a **decentralized exchange (DEX)** for perpetual futures trading on Solana. It combines:
- **Off-chain matching** (C++ engine) - Sub-microsecond order matching
- **On-chain settlement** (Solana smart contracts) - Final custody and settlement
- **Dark Pool** mechanics (hidden order book)** - Privacy-focused execution

**Architecture: The "Hybrid" Model

The system is split into three zones:

### Zone A: Hot Path (C++ Matching Engine)
- **Location:** `gdx/engine/` (future)
- **Infrastructure:** Bare Metal + Systemd
- **State:** In-memory order book, persisted via WAL)

### Zone B: Warm Path (Settlement Relayers, Gateways, Gateways, Liquidation Engine)
- **Location:** `gdx/services/` (Git submodules)
- **submodules)
- **Infrastructure:** Rust microservices
- **Infrastructure:** Kubernetes (EKS/GKE)
- **State:** Stateless pods

### Zone C: The Cold Path (Blockchain)
- **Location:** `gdx/contracts/programs/contracts/programs/` (Git submodules)
- **)
- **Technology:** Solana Smart Contracts (Anchor/Rust)
- **Purpose:** Custody, final settlement

---

## 3. Repository Structure

```
gdx/
├── contracts/programs/     # Zone C: Solana Programs (Git Submodules)
│   ├── gdx-collateral-vault/     # Core Custody
│   │   └── collateral-vault/     # Anchor program
│   ├── gdx-position-mgmt/        # State Compression (Merkle Trees)
│   ├── gdx-funding-rate/         # Funding Calculations
│   ├── gdx-ephemeral-vault/      # Fast Deposits
│   └── gdx-oracle/               # Price Feeds
│
├── services/                 # Zone B: Rust Microservices (Git Submodules)
│   ├── gdx-settlement-relayer/   # Settlement Sequencer
│   ├── gdx-liquidation-engine/   # Risk Engine
│   ├── gateway/              # Websocket/REST API (Future)
│   └── market-data/          # Analytics/Indexing (Future)
│
├── engine/                   # Zone A: C++ Matching Engine (Future)
│   ├── src/
│   └── Dockerfile.dev
│
├── web/                      # Frontend (TO BE BUILT)
│   ├── app/                  # Next.js (Future)
│   └── mock/                 # Mock Engine for UI devs
│
├── config/                   # Global Config Schemas
│   └── global-config.schema.json
├── infra/                    # Infrastructure as Code
│   ├── metal/                # Terraform for Zone A
│   └── k8s/                  # Helm Charts for Zone B
└── devops/          # Dev Productivity Scripts
```

---

## 4. Development Workflow

### Local Development ("Mini-Stack")

**Docker Compose Setup:**
- **File:** `gdx/docker-compose.yml`
- **Services:**
  - `validator`: Solana test validator (port 8899)
  - `mock-engine`: TypeScript/Rust stub for C++ Engine (WebSocket port 8080)
  - `redis`: Config/PubSub
  - `postgres`: Data storage
  - `relayer`: Settlement service (reads from mock-engine, writes to Solana)

**Local Development Commands:**
```bash
# Start the entire stack
docker-compose up

# Run tests for a specific program
cd contracts/programs/gdx-collateral-vault/collateral-vault
anchor test

# Run CI locally (uses nektos-act)
./devops/run-local-ci-collateral-vault.sh
```

---

## 5. Frontend Requirements

Based on `gdx/README.md` and `gdx/technical-docs/godark/`:

### Core Pages

1. **Trade Page** (`app.godark.xyz` - Main Page)
   - Main trading interface
   - Order form (Market, Limit, Peg orders)
   - Chart with symbol selector (Hyperliquid prices and orderbook)
   - Funding rate stats and countdown at header
   - Working Orders table
   - Order History table
   - Open Positions table

2. **Stats** (Pop-up overlay, Order History table
   - Pop-up overlay (don't leave main trade page)
   - Execution Quality & Savings
   - GoDark Market Data
   - Operational Transparency

3. **Referrals** (Pop-up overlay)
   - Simple pop-up at center of screen with blurred trade background
   - Don't leave main page
   - Settings Icon (right side with simple pop-up at center of screen with blurred trade background)

5. **Admin** (on app.godark.xyz)
   - Linked Wallet management
   - API Key Management
   - Account Management
   - Activity

5. **docs.godark.xyz)

### Key Features

- **Wallet Connection:** Phantom, Trust, Solflare, or create new wallet
   - **Order Types:** Market, Limit, Peg to Mid/Bid/Ask)
   - **Time in Force:** IOC, FOK, GTD, GTC
   - **Order Attributes:** AON), Min Qty, NBBO Protection
   - **Visibility:** DARK/LIT
   - **Leverage:** Up to 1,000x (isolated margin)
   - **Settlement Flow:**
     1. User connects wallet
     2. Approves delegate rights (one-time)
     3. Program creates PDA (ephemeral vault)
     4. Trading happens off-chain (C++ engine)
     5. Settlement every 1 second (batched)
     6. Vault cleanup when done

---

## 6. Frontend Tech Stack Recommendations

### Core Stack
- **Framework:** Next.js 14+ (App Router)
- **Blockchain:** `@solana/web3.js`, `@coral-xyz/anchor`
- **Wallet Adapter:** `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`
- **Wallets:** `@solana/wallet-adapter-wallets` (Phantom, Trust, Solflare)
- **State Management:** Zustand or Redux Toolkit
- **UI Library:** Tailwind CSS + shadcn/ui or Radix UI
- **Charts:** TradingView Lightweight Charts or Recharts

### Integration Points

**Solana Connection:**
- Connect to local validator (`http://localhost:8899`) for dev
- Connect to testnet/mainnet for production
- Use `@solana/wallet-adapter-react` for wallet management

**WebSocket Connection:**
- Connect to mock-engine WebSocket (`ws://localhost:8080`) for dev
- Connect to production gateway for real trading
- Handle reconnection logic

---

## 7. API Integration

### API Endpoints
Based on `gdx/technical-docs/godark/endpoints.md`:

**Base URLs:**
- **HTTP:** `https://godark.goquant.io/testnet`
- **Private WS:** `wss://godark.goquant.io/ws/testnet?handshake_token=<TOKEN>`
- **Public WS:** `wss://godark-testnet.goquant.io/ws/public?handshake_token=<TOKEN>`

**Key Endpoints:**
- `POST /create-account` - Create trading account
- `POST /get-account-id` - Get account ID
- `POST /create-api-key` - Generate API key
- `POST /place` - Place order
- `POST /cancel` - Cancel order
- `POST /modify` - Modify order
- `GET /get-instruments` - List trading pairs
- `GET /nbbo/status` - NBBO stream status

**WebSocket Channels:**
- `order_updates` - Real-time order status
- `account_balance` - Balance updates
- `account_transactions` - Transaction history
- `orderbook_l1` - Best bid/offer
- `orderbook_l2` - Full orderbook depth
- `trades` - Trade executions
- `analytics` - Market analytics

---

## 8. Configuration & Feature Flags

**Global Config Schema:** `gdx/config/global-config.schema.json`

**Key Config Fields:**
- `markets`: Array of trading pairs with shard mapping
- `shards`: Matching engine server definitions
- `feature_flags`: Dynamic toggles (`maintenance_mode`, `enable_new_matching_algo`, etc.)

**Frontend Should:**
- Poll config service for available symbols
- Respect feature flags (e.g., disable trading if `maintenance_mode: true`)
- Route orders to correct shard based on symbol map

---

## 9. Smart Contract Integration

### Key Programs (Anchor)

1. **Collateral Vault** (`gdx-collateral-vault`)
   - User deposits/withdrawals
   - PDA-based vaults
   - Delegate approval flow

2. **Position Management** (`gdx-position-mgmt`)
   - Open/close positions
   - PnL tracking
   - Leverage management

3. **Ephemeral Vault** (`gdx-ephemeral-vault`)
   - Fast deposit flow
   - Temporary wallets

### IDL Files
- **Location:** Each program's `target/idl/` after `anchor build`
- **Usage:** Generate TypeScript types via `@coral-xyz/anchor`

**Example:**
```typescript
import { Program } from '@coral-xyz/anchor';
import { IDL } from './idl/collateral_vault';

const program = new Program(IDL, programId, provider);
```

---

## 10. Next Steps for Frontend Development

### Phase 1: Foundation
1. **Setup Next.js Project**
   - Initialize in `gdx/web/app/`
   - Configure Solana wallet adapter
   - Setup Tailwind CSS
   - Configure environment variables

2. **Wallet Connection Flow**
   - Implement wallet selection UI
   - Handle delegate approval transaction
   - Store approval state in localStorage/state

3. **Basic UI Shell**
   - Layout with header (funding rate display)
   - Trade page skeleton
   - Navigation structure

### Phase 2: Core Trading
1. **Order Form Component**
   - Symbol selector (from `/get-instruments`)
   - Order type selection (Market/Limit/Peg)
   - Quantity/Price inputs
   - Leverage slider (1x-1000x)
   - Time in Force dropdown
   - Order attributes checkboxes (AON, Min Qty, NBBO Protection)
   - Visibility toggle (DARK/LIT)

2. **WebSocket Integration**
   - Connect to order updates stream
   - Handle order acknowledgments/fills
   - Real-time position updates

3. **Order Management**
   - Working orders table
   - Cancel/Modify functionality
   - Order history view

### Phase 3: Advanced Features
1. **Position Management**
   - Open positions table
   - Real-time PnL updates
   - Liquidation warnings

2. **Charts & Market Data**
   - TradingView integration
   - Orderbook visualization
   - Trade feed

3. **Account Management**
   - Settings page
   - API key management
   - Activity logs

---

## 11. Important Decisions Made

1. **Monorepo Structure:** All code lives in `gdx/` with git submodules for assignments
2. **Hybrid Architecture:** Off-chain matching + On-chain settlement
3. **No DAO/Token Initially:** Focus on product first, token later (see inception strategy)
4. **Development:** Docker Compose for local stack, nektos-act for CI testing
5. **Submodule Paths:** Programs in `contracts/programs/`, Services in `services/`
6. **CI Scripts:** Updated to use new paths (`contracts/programs/gdx-*`)

---

## 12. Key Files Reference

- **Architecture:** `gdx/technical-docs/godark-master-architecture-2025-12-02.md`
- **Infrastructure:** `gdx/docs/2025-12-02/godark-infrastructure-strategy-2025-12-02.md`
- **Upgrade Strategy:** `gdx/technical-docs/smart-contract-upgrade-strategy-2025-12-02.md`
- **API Docs:** `gdx/technical-docs/godark/endpoints.md`
- **Config Schema:** `gdx/config/global-config.schema.json`
- **Docker Setup:** `gdx/docker-compose.yml`
- **Main README:** `gdx/README.md`

---

## 13. Common Gotchas

1. **Submodule Updates:** Always use `git submodule update --remote` after pulling
2. **CI Paths:** All CI scripts expect paths like `contracts/programs/gdx-*`
3. **Validator:** On Apple Silicon, use external validator (host) mode
4. **Branch Names:** Most submodules use `feature/add-unit-test` (singular), except `gdx-collateral-vault` uses `feature/add-unit-tests` (plural)
5. **Workflow Files:** All workflow YAML files reference `contracts/programs/gdx-*/` paths

---

## 14. Questions to Resolve During Frontend Development

1. **State Management:** Should we use Zustand, Redux, or React Context?
2. **Chart Library:** TradingView Lightweight Charts vs custom solution?
3. **WebSocket Reconnection:** Exponential backoff strategy?
4. **Error Handling:** How to surface Solana transaction errors to users?
5. **Mobile Support:** Responsive design or mobile app later?
6. **Testing:** Unit tests with Jest/Vitest? E2E with Playwright?

---

**Ready to:** Start building the Next.js frontend in `gdx/web/app/`

