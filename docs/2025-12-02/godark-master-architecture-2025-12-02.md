# GoDark Master Architecture

**Version:** 1.0.0 (2025-12-02)
**Status:** Living Document

This document serves as the definitive technical reference for the GoDark decentralized exchange (DEX). It consolidates the infrastructure strategy, development workflow, smart contract upgrade patterns, and repository structure into a unified execution plan.

---

## 1. High-Level System Architecture

GoDark operates a **Hybrid Exchange Model** designed to support 100 Million users with institutional-grade latency (<100µs matching).

### The "Two-Zone" Model

To achieve extreme performance without sacrificing security, the infrastructure is split into two distinct zones:

#### Zone A: The "Hot Path" (Execution)
*   **Function:** Order Matching, Risk Checks, WebSocket Feeds.
*   **Technology:** C++ Monolith (Sharded by Symbol).
*   **Infrastructure:** Bare Metal (EC2 Metal / Packet) + Systemd.
*   **Networking:** Kernel Bypass (DPDK), Host Networking.
*   **State:** In-Memory (Stateful). Persisted via WAL (Write-Ahead Log) and Snapshots.
*   **Scaling:** Vertical Scaling per Shard. Horizontal Scaling by adding Shards (New Symbols).

#### Zone B: The "Warm Path" (Settlement & Data)
*   **Function:** API Gateway, Settlement Relayer, Liquidation Engine, Historical Data.
*   **Technology:** Rust Microservices.
*   **Infrastructure:** Kubernetes (EKS/GKE).
*   **State:** Stateless (relies on DB/Redis/Blockchain).
*   **Scaling:** Horizontal Scaling (Stateless Pods).

#### Zone C: The "Cold Path" (The Bank)
*   **Function:** Custody, Final Settlement, Dispute Resolution.
*   **Technology:** Solana Blockchain (Smart Contracts).
*   **Infrastructure:** Public/Private Validator Network.
*   **State:** Immutable, Persistent.

---

## 2. Repository Structure (Monorepo with Git Submodules)

We utilize a Monorepo structure to ensure type safety and synchronization between the C++ Engine, Rust Relayers, and Solana Smart Contracts.

```
gdx/
├── .github/                  # CI/CD Workflows
├── .gitmodules               # Git submodule definitions
├── config/                   # Global Config Schemas (JSON/Protobuf)
│
├── contracts/                # Zone C: Solana Program Logic
│   └── programs/             # Git Submodules
│       ├── gdx-collateral-vault/     # Core Custody (Submodule)
│       ├── gdx-position-mgmt/        # State Compression (Submodule)
│       ├── gdx-funding-rate/         # Funding Calculations (Submodule)
│       ├── gdx-ephemeral-vault/      # Fast Deposits (Submodule)
│       └── gdx-oracle/               # Price Feeds (Submodule)
│
├── services/                 # Zone B: Rust Microservices
│   ├── gdx-settlement-relayer/   # Settlement Sequencer (Submodule)
│   ├── gdx-liquidation-engine/   # Risk Engine (Submodule)
│   ├── gateway/              # Websocket/REST API (Future)
│   └── market-data/          # Analytics/Indexing (Future)
│
├── engine/                   # Zone A: C++ Matching Engine (Future)
│   ├── src/
│   └── Dockerfile.dev        # For local development
│
├── web/                      # Frontend
│   ├── app/                  # Next.js
│   └── mock/                 # Mock Engine for UI devs
├── infra/                    # Infrastructure as Code
│   ├── metal/                # Terraform for Zone A
│   └── k8s/                  # Helm Charts for Zone B
└── scripts/                  # Dev Productivity Scripts
```

**Submodule Organization:**
*   **Zone C (Solana Programs):** Located in `contracts/programs/` as git submodules
*   **Zone B (Rust Services):** Located in `services/` as git submodules
*   All submodules maintain their `gdx-*` naming convention and are properly linked via `.gitmodules`

---

## 3. Development Strategy

### The "Mini-Stack" (Local Development)
Developing against a 100-node cluster is impossible locally. We use a simulated environment:

*   **Docker Compose:** Orchestrates the stack.
*   **Mock Engine:** A TypeScript/Rust stub that mimics the C++ Engine's WebSocket API but runs locally.
*   **Local Validator:** `solana-test-validator` running the actual programs.
*   **Sharding Simulation:** The local engine runs with `SHARD_ID=all` to handle all symbols in one process.

### Configuration & Feature Flags
Dynamic management without code deployments:

1.  **Global Config Service:** A centralized JSON/Redis store for:
    *   **Symbol Map:** `BTC-USDT -> Shard 1`, `ETH-USDT -> Shard 2`.
    *   **Feature Flags:** `enable_new_matching_algo`, `maintenance_mode`.
2.  **On-Chain Config:** For critical protocol parameters (e.g., `is_paused`).

---

## 4. Smart Contract Upgrade Strategy

We employ a **"Versioned Batch"** pattern to synchronize the high-speed Off-Chain layer with the slower On-Chain layer.

1.  **Phase 1 (On-Chain):** Deploy Program V2 that supports *both* `BatchV1` and `BatchV2`.
2.  **Phase 2 (Off-Chain):** Upgrade Relayer/Engine to emit `BatchV2`.
3.  **Phase 3 (Cleanup):** Deprecate `BatchV1` support on-chain.

**Emergency Playbook:**
*   **Feature Flags:** Use on-chain config to toggle logic paths instantly.
*   **Maintenance Mode:** "Stop-The-World" protocol for Hard Forks (breaking changes).

---

## 5. Infrastructure Scaling Roadmap

### Phase 1: Inception (0 - 10k Users)
*   **Zone A:** 1 Bare Metal Server (All Shards).
*   **Zone B:** 1 Kubernetes Cluster (Dev/Prod Namespace).
*   **Zone C:** Solana Mainnet.

### Phase 2: Growth (10k - 1M Users)
*   **Zone A:** 3-5 Servers (Sharding by Symbol Group).
*   **Zone B:** Auto-scaling Gateway Pods.
*   **Zone C:** State Compression (Merkle Trees) implementation.

### Phase 3: Scale (1M - 100M Users)
*   **Zone A:** 50+ Servers (Geo-located Primary).
*   **Zone B:** Multi-Region Kubernetes.
*   **Zone C:** Custom Solana L2/Rollup if Mainnet capacity is exceeded.

---

## 6. Developer Experience (DX) Goals
*   **One Command Setup:** `npm run dev` starts the entire Mini-Stack.
*   **Type Safety:** Protobuf/IDL shared across C++, Rust, and TS.
*   **Hermetic Builds:** Docker for everything (except Bare Metal final compile).
