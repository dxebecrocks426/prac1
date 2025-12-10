# Solana Blockchain Developer Assignments - Perpetual Futures DEX

## Overview

This directory contains 8 technical assignments for Solana blockchain developer candidates. Each assignment focuses on a specific component of a high-performance decentralized perpetual futures exchange architecture and is designed to assess advanced Rust, Solana, and DeFi development skills.

## Assignment Structure

Each assignment is a complete, production-ready component that combines:
- **Solana Smart Contracts** (Anchor/Rust programs)
- **Rust Backend Services** (off-chain infrastructure)
- **Integration Points** (APIs, monitoring, databases)
- **Comprehensive Testing** (unit, integration, and on-chain tests)

**Estimated Effort:** Approximately 1 week of development work per assignment

**Submission Deadline:** 7 days from assignment receipt

## Assignments

### 1. Settlement Relayer & Batch Processing
**File:** `settlement-relayer-assignment.md`

**Component:** Bridges off-chain trade execution with on-chain settlement

**Key Technologies:**
- Batch accumulation (1-second windows)
- Merkle tree verification
- Net position calculation
- Transaction building and submission
- Settlement monitoring and retry logic

**Performance Target:** 100+ trades/second throughput

---

### 2. Position Management System
**File:** `position-management-assignment.md`

**Component:** Manages leveraged positions with margin calculations and PnL tracking

**Key Technologies:**
- PDA-based position accounts
- Margin ratio calculations
- Leverage support (1-1000x)
- Unrealized/realized PnL tracking
- Liquidation price determination

**Performance Target:** 10,000+ concurrent positions

---

### 3. Liquidation Engine
**File:** `liquidation-engine-assignment.md`

**Component:** Real-time position monitoring and automatic liquidation system

**Key Technologies:**
- Position monitoring (100ms intervals)
- Partial and full liquidation logic
- Liquidator rewards mechanism
- Insurance fund integration
- Bad debt handling

**Performance Target:** 100+ concurrent liquidations during volatility

---

### 4. Ephemeral Vault System
**File:** `ephemeral-vault-assignment.md`

**Component:** Temporary session-based wallets with delegation for gasless trading

**Key Technologies:**
- PDA-based temporary vaults
- Delegate approval mechanism
- Auto-deposit for transaction fees
- Session expiry and cleanup
- Secure key management

**Performance Target:** 1,000+ concurrent sessions

---

### 5. Funding Rate Calculation System
**File:** `funding-rate-assignment.md`

**Component:** Perpetual futures funding rate calculation and hourly payment distribution

**Key Technologies:**
- 1-second calculation interval (86,400 calcs/day)
- Premium index calculation
- Hourly payment aggregation
- Oracle integration (Pyth/Switchboard)
- Rate clamping and validation

**Performance Target:** 50+ symbols, sub-50ms calculation latency

---

### 6. Oracle Integration & Price Feeds
**File:** `oracle-integration-assignment.md`

**Component:** Multi-oracle price feed system with validation and failover

**Key Technologies:**
- Pyth Network integration
- Switchboard fallback oracle
- Price consensus calculation (median)
- Confidence interval validation
- Manipulation detection

**Performance Target:** < 500ms price update latency, 99.9% uptime

---

### 7. Collateral Vault Management
**File:** `collateral-vault-assignment.md`

**Component:** Non-custodial collateral vaults with SPL Token management

**Key Technologies:**
- PDA-based vaults
- SPL Token operations (USDT)
- Lock/unlock collateral mechanism
- Cross-program invocations (CPIs)
- Balance tracking and reconciliation

**Performance Target:** 10,000+ vaults, 100+ ops/second

---

### 8. Program Upgrade & Migration System
**File:** `program-upgrade-assignment.md`

**Component:** Safe protocol upgrades with governance and state migration

**Key Technologies:**
- Multisig governance
- Timelock mechanism (48-hour delay)
- Program buffer management
- Account state migration
- Rollback capability

**Performance Target:** Zero-downtime upgrades, complete state preservation

---

## Evaluation Criteria

Candidates will be evaluated on:

1. **Technical Excellence**
   - Clean, idiomatic Rust code
   - Proper Anchor framework usage
   - Efficient Solana programming patterns
   - Performance optimization

2. **System Design**
   - Architecture decisions
   - Component integration design
   - Error handling strategy
   - Scalability considerations

3. **Security**
   - Authority validation
   - Input sanitization
   - Attack surface mitigation
   - Secure key management

4. **Testing & Quality**
   - Test coverage (unit + integration)
   - Edge case handling
   - Documentation quality
   - Code maintainability

5. **DeFi Understanding**
   - Grasp of perpetual futures mechanics
   - Understanding of risk management
   - Oracle integration knowledge
   - Economic mechanism design

## Submission Requirements

All candidates must submit:

1. **Source Code**
   - GitHub repository (private) or zip file
   - Complete Anchor program
   - Rust backend service
   - Database migrations
   - Test suite

2. **Video Demonstration** (10-15 minutes)
   - Architecture overview
   - Live system demo
   - Code walkthrough
   - Design decision explanation

3. **Technical Documentation**
   - System architecture
   - API specifications
   - Deployment guide
   - Security analysis

4. **Test Results**
   - Coverage reports
   - Performance metrics
   - Test execution logs

**Submission Email:** careers@goquant.io  
**CC:** himanshu.vairagade@goquant.io

---

## Assignment Distribution

- Each candidate receives **ONE** assignment
- Candidates are grouped by component (8 groups total)
- Best performer from each group will be selected to build their assigned component
- All components will be integrated to form the complete perpetual futures DEX system

## Confidentiality

All assignments and submissions are strictly confidential and for GoQuant recruitment purposes only. Candidates must not share their work publicly (GitHub, YouTube, etc.) and must keep all materials private.

---

## Contact

For questions about assignments:
- Email: careers@goquant.io
- Technical inquiries: himanshu.vairagade@goquant.io

---

**Last Updated:** October 29, 2025  
**Version:** 1.0

