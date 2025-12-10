# Smart Contract Synchronization & Upgrade Strategy

## 1. The Challenge: The "Two-Speed" System
GoDark operates a hybrid exchange architecture consisting of two distinct layers running at vastly different speeds:

1.  **Off-Chain Layer (C++ Matching Engine / Rust Relayers):**
    *   **Speed:** Microseconds (matching), Milliseconds (relaying).
    *   **Deployment:** Instant. Binaries can be swapped on Zone A/B servers in seconds via systemd/K8s.
    *   **State:** Ephemeral (Orderbook) or Reconstructible (SQL/Logs).

2.  **On-Chain Layer (Solana Program):**
    *   **Speed:** 400ms - 1s (Block times).
    *   **Deployment:** "Heavy". Program upgrades require multisig approval, timelocks, and network propagation.
    *   **State:** Persistent and Immutable (Merkle Roots, Vault Balances).

**The Synchronization Risk:**
If the C++ engine is upgraded to emit `TradeEvent V2` (e.g., adding a new order type), but the on-chain `Settlement` program only understands `TradeEvent V1`, the `Settlement Relayer` will fail to construct valid settlement transactions. This breaks the bridge between execution and settlement, potentially halting withdrawals.

---

## 2. The Solution: Versioned Protocol Buffers & Feature Flags

To decouple the deployment lifecycles of the blockchain and the matching engine, we employ a **"Versioned Batch"** pattern combined with **On-Chain Feature Flags**.

### A. The "Versioned Batch" Pattern
We avoid "Big Bang" upgrades where both systems change simultaneously. Instead, we use a phased approach supported by Protocol Buffers (Protobuf) or Borsh versioning.

#### Phase 1: On-Chain Support (The "Pre-Flight")
*   **Action:** Upgrade the Solana Program first.
*   **Change:** The program is updated to support *both* `BatchV1` (Legacy) and `BatchV2` (New) instructions.
*   **Mechanism:** The Anchor program instruction handler routes based on a version byte.
    ```rust
    pub fn settle_batch(ctx: Context<SettleBatch>, data: Vec<u8>) -> Result<()> {
        match data[0] {
            1 => process_batch_v1(ctx, &data[1..]),
            2 => process_batch_v2(ctx, &data[1..]),
            _ => err!(ErrorCode::InvalidBatchVersion),
        }
    }
    ```
*   **Status:** The system is still running V1 live. V2 code is deployed but inactive (dormant).

#### Phase 2: Off-Chain Activation (The "Switch")
*   **Action:** Upgrade the `Settlement Relayer` (Zone B) and C++ Engine (Zone A).
*   **Change:** The C++ engine starts emitting V2 events. The Relayer starts constructing V2 transactions.
*   **Status:** The system now processes V2. The on-chain program accepts it because Phase 1 was already completed.

#### Phase 3: Deprecation (The "Cleanup")
*   **Action:** (Optional) Upgrade Solana Program to reject `BatchV1`.
*   **Reason:** Reduces binary size (bytecode limit) and attack surface.

### B. The "Feature Flag" Contract
The `Settlement` program maintains a `GlobalConfig` PDA that acts as a dynamic configuration store. This allows us to toggle behavior without re-deploying the entire program.

**Config PDA Structure:**
```rust
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub is_paused: bool,              // Global Kill Switch
    pub min_batch_size: u32,          // Performance Tuning
    pub allowed_batch_versions: u8,   // Bitmask: 1=V1, 2=V2, 3=Both
    pub active_relayer: Pubkey,       // The specific Relayer key allowed to sign
}
```

**Upgrade Flow via Flags:**
1.  Deploy new logic (hidden behind a flag).
2.  Send a transaction to update `GlobalConfig` enabling the new flag.
3.  Monitor metrics.
4.  If instability is detected, instantly revert the `GlobalConfig` transaction to disable the flag (0-latency rollback).

---

## 3. The "Buffer Zone" (Hard Fork Maintenance Mode)
Some upgrades are "Hard Forks"—breaking changes where V1 and V2 cannot coexist (e.g., changing the Merkle Tree structure or Account Layout).

**The "Stop-The-World" Playbook:**

1.  **Enter Maintenance Mode:**
    *   **API/Gateway:** Return `503 Service Unavailable`. Websockets send `System Maintenance` alert.
    *   **C++ Engine:** Pause matching. Reject new orders.
    *   **Relayer:** "Flush" mode. Process all pending trades in the queue and settle them on-chain. Ensure `Pending Trades = 0`.

2.  **The Upgrade:**
    *   **Solana:** Deploy the new Program ID (or upgrade existing). Initialize new State Accounts if needed (e.g., New Merkle Tree).
    *   **Infrastructure:** Deploy new C++ Binaries and Rust Relayers.

3.  **Verification (The "Test Flight"):**
    *   Relayer sends a "Heartbeat Batch" (0-value trades or a specific `Ping` instruction) to the new program.
    *   Verify the signature verification and state root update succeed.

4.  **Resume:**
    *   Enable Gateways.
    *   Resume Matching.

---

## 4. CI/CD Safeguards (The "Gatekeeper")
To prevent accidental mismatches, the CI pipeline enforces strict compatibility checks.

1.  **IDL Versioning:**
    *   The Anchor IDL (Interface Definition Language) is the single source of truth.
    *   Both the C++ Engine (via protobuf generation) and the Rust Relayer consume the same schema definition.
2.  **Integration Tests:**
    *   Before any C++ deployment, the CI runs a `sim-test`:
        *   Spin up a `solana-test-validator` with the *currently deployed* on-chain program.
        *   Run the *new* C++ binary against it.
        *   **Pass:** If the C++ engine output can be successfully settled by the *current* program (for Phase 1) or the *staged* program (for Phase 2).
        *   **Fail:** If the program rejects the batch (Instruction Error).

---

## 5. Emergency Rollback Plan
What happens if an upgrade goes wrong *after* we switch?

*   **Scenario:** We switched to V2, but the Solana program is calculating fees incorrectly.
*   **Response:**
    1.  **Pause:** Toggle `GlobalConfig.is_paused = true` (stops all settlement).
    2.  **Revert Off-Chain:** Rollback C++ and Relayer binaries to V1 (Docker tag rollback).
    3.  **Revert On-Chain (Config):** Update `GlobalConfig.allowed_batch_versions` to allow V1 again.
    4.  **Resume:** Unpause. The system resumes using the old, stable logic.
    *   *Note:* This requires that the On-Chain program wasn't "Hard Forked" (i.e., V1 logic is still present in the bytecode).

## 6. Summary Checklist for Upgrades

| Step | Action | Responsible |
| :--- | :--- | :--- |
| 1 | **Draft IDL Changes:** Define new Batch/Trade format. | Protocol Architect |
| 2 | **Implement Phase 1:** Add V2 logic to Solana Program. | Blockchain Engineer |
| 3 | **Deploy Phase 1:** Upgrade Program on Mainnet. | DevOps / MultiSig |
| 4 | **Verify Phase 1:** Confirm V1 trades still settle correctly. | QA / Relayer Logs |
| 5 | **Implement Phase 2:** Update C++/Relayer to use V2. | C++ / Rust Engineer |
| 6 | **Deploy Phase 2:** Rolling restart of Zone A/B servers. | DevOps |
| 7 | **Monitor:** Watch for Settlement Errors or Latency spikes. | SRE |
