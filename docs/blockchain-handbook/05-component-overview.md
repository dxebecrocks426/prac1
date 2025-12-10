# GoDark DEX Component Overview

## Overview

GoDark DEX consists of **8 core components** that work together to provide a high-performance perpetual futures trading platform. This guide provides a high-level overview of each component, their interactions, and shared patterns.

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│              (Web UI, Mobile App, API Clients)             │
└────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│              API & WebSocket Gateway                         │
│         (Authentication, Rate Limiting, Routing)            │
└────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│            Off-Chain Matching Engine                         │
│         (Dark Pool Order Book, Matching Algorithm)           │
└────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│            Settlement Relayer (Component 1)                 │
│    (Batch Accumulation, Merkle Trees, Transaction Building)  │
└────────────────────┬────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐        ┌─────────▼──────────┐
│  On-Chain      │        │  Off-Chain        │
│  Components    │        │  Components       │
│                │        │                   │
│ ┌───────────┐  │        │ ┌──────────────┐ │
│ │ Position  │  │        │ │ Oracle       │ │
│ │ Management│◄─┼────────┼─│ Integration  │ │
│ │ (Comp 2)  │  │        │ │ (Comp 6)     │ │
│ └───────────┘  │        │ └──────────────┘ │
│                │        │                  │
│ ┌───────────┐  │        │ ┌──────────────┐ │
│ │Liquidation│  │        │ │ Funding Rate │ │
│ │  Engine   │◄─┼────────┼─│ (Comp 5)     │ │
│ │ (Comp 3)  │  │        │ └──────────────┘ │
│ └───────────┘  │        │                  │
│                │        │ ┌──────────────┐ │
│ ┌───────────┐  │        │ │ Ephemeral   │ │
│ │ Collateral│  │        │ │ Vault       │ │
│ │   Vault   │  │        │ │ (Comp 4)    │ │
│ │ (Comp 7)  │  │        │ └──────────────┘ │
│ └───────────┘  │        │                  │
│                │        │ ┌──────────────┐ │
│ ┌───────────┐  │        │ │   Program   │ │
│ │  Program  │  │        │ │   Upgrade   │ │
│ │  Upgrade  │  │        │ │  (Comp 8)   │ │
│ │ (Comp 8)  │  │        │ └──────────────┘ │
│ └───────────┘  │        │                  │
└────────────────┘        └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Solana Blockchain                          │
│           (Consensus, Finality, State Storage)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: Settlement Relayer & Batch Processing

### Purpose

Bridges off-chain trade execution with on-chain settlement, enabling high-throughput trading while maintaining on-chain security.

### Key Responsibilities

1. **Batch Accumulation**
   - Collects trades in 1-second windows
   - Groups by user and market
   - Prepares for batch settlement

2. **Net Position Calculation**
   - Calculates net position changes per user
   - Reduces on-chain operations
   - Optimizes transaction size

3. **Merkle Tree Generation**
   - Creates Merkle tree of all trades
   - Enables efficient verification
   - Prevents trade manipulation

4. **Transaction Building**
   - Constructs Solana transactions
   - Includes all required accounts
   - Handles compute budget

5. **Settlement Execution**
   - Submits transactions to Solana
   - Monitors confirmation
   - Retries on failure

### Technology Stack

- **Language**: Rust
- **Framework**: Anchor (for on-chain program)
- **Database**: PostgreSQL (trade history)
- **Performance**: 100+ trades/second target

### Integration Points

- **Input**: Off-chain matching engine (trades)
- **Output**: Position Management program (on-chain)
- **Dependencies**: Oracle Integration (for price verification)

### Key Patterns

- **Batch Processing**: Accumulate trades before settlement
- **Merkle Trees**: Cryptographic verification
- **Netting**: Reduce on-chain operations
- **Retry Logic**: Handle transaction failures

---

## Component 2: Position Management System

### Purpose

Manages leveraged positions with margin calculations, PnL tracking, and position lifecycle management.

### Key Responsibilities

1. **Position Creation**
   - Create PDA-based position accounts
   - Validate leverage tier
   - Lock collateral

2. **Margin Calculations**
   - Initial margin requirements
   - Maintenance margin checks
   - Margin ratio monitoring

3. **PnL Tracking**
   - Unrealized PnL calculation
   - Realized PnL on close
   - Funding rate integration

4. **Position Modifications**
   - Add/remove collateral
   - Increase/decrease size
   - Partial closes

5. **Position Closing**
   - Full position closure
   - PnL realization
   - Collateral return

### Technology Stack

- **On-Chain**: Anchor program (Rust)
- **Off-Chain**: Rust service
- **Database**: PostgreSQL (position history)

### Integration Points

- **Input**: Settlement Relayer (position updates)
- **Output**: Liquidation Engine (position data)
- **Dependencies**: 
  - Collateral Vault (collateral management)
  - Oracle Integration (mark price)
  - Funding Rate (funding payments)

### Key Patterns

- **PDA Positions**: One position account per user per market
- **Margin Calculations**: Fixed-point arithmetic
- **State Machine**: Position lifecycle states
- **Versioning**: Account version for migrations

---

## Component 3: Liquidation Engine

### Purpose

Real-time position monitoring and automatic liquidation system to protect protocol solvency.

### Key Responsibilities

1. **Position Monitoring**
   - Monitor all open positions
   - Check margin ratios
   - Detect liquidation candidates

2. **Liquidation Execution**
   - Partial liquidation logic
   - Full liquidation logic
   - Transaction building

3. **Liquidator Rewards**
   - Calculate rewards
   - Distribute to liquidators
   - Incentivize participation

4. **Insurance Fund Integration**
   - Cover bad debt
   - Monitor fund health
   - Emergency procedures

5. **Bad Debt Handling**
   - Detect bad debt scenarios
   - Insurance fund coverage
   - Protocol pause if needed

### Technology Stack

- **On-Chain**: Anchor program
- **Off-Chain**: Rust service (monitoring)
- **Database**: PostgreSQL (liquidation history)

### Integration Points

- **Input**: Position Management (position data)
- **Output**: Position Management (liquidation execution)
- **Dependencies**:
  - Oracle Integration (mark price)
  - Collateral Vault (collateral handling)
  - Insurance Fund (bad debt coverage)

### Key Patterns

- **Real-Time Monitoring**: 100ms scan intervals
- **Priority Queue**: Liquidate most critical first
- **Partial Liquidation**: Restore margin ratio
- **Reward Mechanism**: Incentivize liquidators

---

## Component 4: Ephemeral Vault System

### Purpose

Temporary session-based wallets with delegation for gasless trading and improved UX.

### Key Responsibilities

1. **Session Creation**
   - Generate ephemeral keypairs
   - Create PDA-based vaults
   - Set session expiry

2. **Delegation Management**
   - Approve delegate for trading
   - Verify delegation
   - Revoke access

3. **Auto-Deposit**
   - Monitor SOL balance
   - Auto-deposit for fees
   - Maintain minimum balance

4. **Transaction Signing**
   - Sign with ephemeral wallet
   - Handle priority fees
   - Retry logic

5. **Session Cleanup**
   - Detect expired sessions
   - Cleanup resources
   - Return remaining SOL

### Technology Stack

- **On-Chain**: Anchor program
- **Off-Chain**: Rust service (key management)
- **Database**: PostgreSQL (session tracking)

### Integration Points

- **Input**: User requests (session creation)
- **Output**: Settlement Relayer (signed transactions)
- **Dependencies**: Position Management (for trading)

### Key Patterns

- **Ephemeral Keypairs**: Temporary wallets
- **Delegation**: Approve trading authority
- **Auto-Deposit**: Maintain SOL for fees
- **Session Expiry**: Automatic cleanup

---

## Component 5: Funding Rate Calculation System

### Purpose

Perpetual futures funding rate calculation and hourly payment distribution.

### Key Responsibilities

1. **Rate Calculation**
   - Calculate every 1 second
   - Premium index calculation
   - Interest rate calculation
   - Rate clamping

2. **Hourly Aggregation**
   - Aggregate 3,600 samples
   - Calculate average rate
   - Prepare for distribution

3. **Payment Distribution**
   - Apply to all open positions
   - Longs pay shorts (or vice versa)
   - Update position collateral

4. **History Tracking**
   - Store rate history
   - Calculate statistics
   - Provide API access

5. **Oracle Integration**
   - Fetch mark price
   - Fetch index price
   - Handle oracle failures

### Technology Stack

- **Off-Chain**: Rust service (calculation loop)
- **On-Chain**: Anchor program (payment distribution)
- **Database**: PostgreSQL (rate history)
- **Cache**: Redis (fast rate access)

### Integration Points

- **Input**: Oracle Integration (prices)
- **Output**: Position Management (funding payments)
- **Dependencies**: Oracle Integration (price feeds)

### Key Patterns

- **1-Second Loop**: Continuous calculation
- **Hourly Aggregation**: Batch payments
- **Parallel Processing**: 50+ symbols
- **Rate Clamping**: Prevent extreme rates

---

## Component 6: Oracle Integration & Price Feeds

### Purpose

Multi-oracle price feed system with validation, consensus, and failover.

### Key Responsibilities

1. **Oracle Integration**
   - Pyth Network integration
   - Switchboard fallback
   - Price normalization

2. **Price Consensus**
   - Median calculation
   - Outlier detection
   - Weighted averaging

3. **Validation**
   - Confidence intervals
   - Staleness checks
   - Manipulation detection

4. **Failover**
   - Automatic failover
   - Health monitoring
   - Circuit breakers

5. **Price Distribution**
   - Cache prices (Redis)
   - WebSocket updates
   - API access

### Technology Stack

- **Off-Chain**: Rust service
- **Database**: PostgreSQL (price history)
- **Cache**: Redis (current prices)
- **WebSocket**: Real-time updates

### Integration Points

- **Input**: Pyth/Switchboard (price feeds)
- **Output**: 
  - Funding Rate (mark price)
  - Liquidation Engine (mark price)
  - Position Management (mark price)

### Key Patterns

- **Multi-Oracle**: Redundancy
- **Consensus**: Median/weighted average
- **Failover**: Automatic switching
- **Caching**: Fast price access

---

## Component 7: Collateral Vault Management

### Purpose

Non-custodial collateral vaults with SPL Token management.

### Key Responsibilities

1. **Vault Creation**
   - Create PDA-based vaults
   - Create associated token accounts
   - Initialize balances

2. **Deposit/Withdraw**
   - SPL Token transfers
   - Balance tracking
   - Transaction history

3. **Collateral Locking**
   - Lock for positions
   - Unlock on close
   - CPI-callable

4. **Balance Tracking**
   - On-chain balance
   - Off-chain reconciliation
   - Discrepancy detection

5. **Vault Monitoring**
   - Monitor all vaults
   - Track TVL
   - Detect anomalies

### Technology Stack

- **On-Chain**: Anchor program
- **Off-Chain**: Rust service
- **Database**: PostgreSQL (vault history)

### Integration Points

- **Input**: User deposits/withdrawals
- **Output**: Position Management (collateral)
- **Dependencies**: SPL Token Program

### Key Patterns

- **PDA Vaults**: Deterministic addresses
- **SPL Token CPI**: Token transfers
- **Lock/Unlock**: Position collateral
- **Reconciliation**: On-chain vs off-chain

---

## Component 8: Program Upgrade & Migration System

### Purpose

Safe protocol upgrades with governance, timelock, and state migration.

### Key Responsibilities

1. **Upgrade Proposals**
   - Create proposals
   - Link program buffers
   - Set timelock

2. **Multisig Governance**
   - Collect approvals
   - Threshold validation
   - Execute when ready

3. **Timelock Enforcement**
   - 48-hour minimum delay
   - Countdown monitoring
   - Prevent early execution

4. **State Migration**
   - Identify accounts to migrate
   - Transform data
   - Verify migration

5. **Rollback Capability**
   - Detect failures
   - Revert to previous version
   - Restore state

### Technology Stack

- **On-Chain**: Anchor program
- **Off-Chain**: Rust service
- **Database**: PostgreSQL (upgrade history)

### Integration Points

- **Input**: Governance proposals
- **Output**: All DEX programs (upgrades)
- **Dependencies**: BPF Upgradeable Loader

### Key Patterns

- **Multisig**: Custom implementation
- **Timelock**: On-chain enforcement
- **Migration**: Account versioning
- **Rollback**: Emergency recovery

---

## Component Interactions

### Data Flow

```
User Trade Request
    ↓
Matching Engine (off-chain)
    ↓
Settlement Relayer (Component 1)
    ↓
Position Management (Component 2)
    ├─→ Collateral Vault (Component 7) - Lock collateral
    ├─→ Oracle Integration (Component 6) - Get mark price
    └─→ Funding Rate (Component 5) - Track for funding
    ↓
Liquidation Engine (Component 3) - Monitor position
    ├─→ Oracle Integration (Component 6) - Check mark price
    └─→ Position Management (Component 2) - Execute liquidation
```

### Integration Matrix

| Component | Integrates With | Purpose |
|-----------|----------------|---------|
| Settlement Relayer | Position Management | Update positions |
| Position Management | Collateral Vault | Lock/unlock collateral |
| Position Management | Oracle Integration | Get mark price |
| Position Management | Funding Rate | Receive funding payments |
| Liquidation Engine | Position Management | Read positions |
| Liquidation Engine | Oracle Integration | Get mark price |
| Liquidation Engine | Collateral Vault | Handle liquidated collateral |
| Funding Rate | Oracle Integration | Get mark/index prices |
| Ephemeral Vault | Settlement Relayer | Sign transactions |
| Program Upgrade | All Components | Upgrade programs |

---

## Shared Patterns

### 1. PDA-Based Accounts

**Pattern**: Use PDAs for deterministic addresses

**Examples:**
- Position accounts: `[b"position", user_pubkey]`
- Vault accounts: `[b"vault", user_pubkey]`
- Config accounts: `[b"config"]`

**Benefits:**
- Deterministic addresses
- Program-controlled
- No key management

### 2. Cross-Program Invocations (CPIs)

**Pattern**: Programs call other programs

**Examples:**
- Collateral Vault → SPL Token Program (transfers)
- Position Management → Collateral Vault (lock/unlock)
- Settlement Relayer → Position Management (updates)

**Benefits:**
- Composability
- Code reuse
- Modularity

### 3. Error Handling

**Pattern**: Custom error types with clear messages

**Examples:**
```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Invalid leverage tier")]
    InvalidLeverage,
}
```

**Benefits:**
- Clear error messages
- Type safety
- Better debugging

### 4. Account Versioning

**Pattern**: Version field in account data

**Examples:**
```rust
#[account]
pub struct Position {
    pub version: u32,
    // ... other fields
}
```

**Benefits:**
- Migration support
- Backward compatibility
- Upgrade safety

### 5. Event Emission

**Pattern**: Emit events for off-chain tracking

**Examples:**
```rust
emit!(PositionOpened {
    user: user_pubkey,
    position_id: position_pda,
    size: position_size,
});
```

**Benefits:**
- Off-chain indexing
- Real-time updates
- Audit trail

---

## Component-Specific Patterns

### Settlement Relayer
- **Batch Processing**: Accumulate before settlement
- **Merkle Trees**: Cryptographic verification
- **Netting**: Reduce operations

### Position Management
- **Fixed-Point Math**: Precise calculations
- **State Machine**: Position lifecycle
- **Margin Calculations**: Real-time monitoring

### Liquidation Engine
- **Priority Queue**: Critical positions first
- **Partial Liquidation**: Restore margin ratio
- **Reward Mechanism**: Incentivize liquidators

### Ephemeral Vault
- **Session Management**: Expiry and cleanup
- **Delegation**: Approve trading authority
- **Auto-Deposit**: Maintain SOL balance

### Funding Rate
- **Time-Series**: 1-second samples
- **Aggregation**: Hourly averages
- **Distribution**: Batch payments

### Oracle Integration
- **Multi-Source**: Pyth + Switchboard
- **Consensus**: Median/weighted average
- **Failover**: Automatic switching

### Collateral Vault
- **SPL Token CPI**: Token operations
- **Reconciliation**: On-chain vs off-chain
- **Lock/Unlock**: Position collateral

### Program Upgrade
- **Multisig**: Governance approval
- **Timelock**: 48-hour delay
- **Migration**: Account transformation

---

## Key Takeaways

1. **8 Components** work together to form GoDark DEX
2. **Hybrid Architecture**: Off-chain matching, on-chain settlement
3. **Shared Patterns**: PDAs, CPIs, error handling, versioning
4. **Integration Points**: Components communicate via APIs and on-chain calls
5. **Modularity**: Each component is independently deployable
6. **Security**: Multiple layers of validation and checks

---

## Next Steps

- Study your assigned component in detail
- Review component assignment documentation
- Understand integration points with other components
- Review **[06-development-workflow.md](./06-development-workflow.md)** for development practices
- Check **[07-testing-strategies.md](./07-testing-strategies.md)** for testing approaches

---

**Last Updated:** January 2025

