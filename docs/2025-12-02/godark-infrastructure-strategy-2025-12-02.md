# Infrastructure Strategy for 100M User HFT DEX

## 1. The "Hybrid" Deployment Model
For a high-frequency exchange, "One size fits all" does not work. You must split your infrastructure into two distinct zones based on performance requirements.

### Zone A: The "Hot Path" (Matching Engine - C++)
*   **Deployment:** **Bare Metal (EC2 Metal / Packet) + Systemd**.
    *   **Why?** Kubernetes networking (CNI, IPTables, Ingress) introduces non-deterministic latency (jitter). Docker adds slight overhead. For <100µs matching, you want raw access to the CPU and NIC (Kernel Bypass/DPDK).
    *   **Orchestration:** Use Terraform/Ansible (Immutable Infrastructure). Treat these servers as "Pets" or highly tuned "Cattle", not generic pods.
*   **Networking:** Host Networking. No overlay networks.
*   **Location:** Single Availability Zone (AZ) or specific Data Center for the primary engine to minimize internal latency.

### Zone B: The "Warm Path" (Gateways, Relayers, Data)
*   **Deployment:** **Kubernetes (EKS/GKE)**.
    *   **Why?** These services (Rust Relayer, WebSocket Gateways, API Rest) are stateless or effectively stateless. They need horizontal scaling to handle 100M concurrent connections.
    *   **Orchestration:** Helm Charts + ArgoCD.
*   **Scale:** This is where you handle the 100M users. The K8s layer absorbs the massive connection load and funnels clean, serialized messages to Zone A.

## 2. State Management & Parallelization
You asked: *"What does load balancing mean for state management?"*

### The Hard Truth: You Cannot Load Balance a Single Order Book
*   **Symbol Sharding:** You cannot run `BTC-USDT` on two servers simultaneously (Active-Active) without complex consensus (Paxos/Raft) which kills latency.
*   **The Strategy:** **Sharding by Symbol**.
    *   Server 1 (Zone A): Runs `BTC-USDT`.
    *   Server 2 (Zone A): Runs `ETH-USDT`.
    *   Server 3 (Zone A): Runs `SOL-USDT`.
*   **Load Balancing:** The *Gateway Layer* (Zone B, K8s) knows which server holds which symbol. It routes `PlaceOrder(BTC)` traffic to Server 1 and `PlaceOrder(ETH)` to Server 2.

### Shared Memory & Redis
*   **Cross-Cloud Redis Cache?** **NO.**
    *   **Latency:** AWS us-east-1 to GCP us-east1 is ~10-20ms. Your matching engine runs at 100µs. A cross-cloud cache is 100x too slow for the hot path.
    *   **Role of Redis:** Use Redis (Cluster mode in K8s) for:
        1.  **User Sessions/Auth:** (Zone B)
        2.  **Read-Only Market Data:** Engine publishes updates -> Redis -> Websocket Gateways push to 100M users.
        3.  **Dedup/Idempotency:** Checking if a `ClientOrderId` was already seen (Zone B).

## 3. Failover & Cross-Cloud Strategy
Do not try "Active-Active Cross-Cloud" for the matching engine. It causes "Split Brain" (two users buying the same asset at the same time in different clouds).

### Recommended Pattern: Primary-Standby (Warm Failover)
*   **Primary (AWS):** Active Matching Engine processing trades.
*   **Standby (GCP/Another AZ):** "Shadow" Engine.
    *   Receives the same input stream (sequenced) from the Gateway.
    *   Processes inputs but **discards output**.
    *   Keeps state roughly synchronized.
*   **Failover:** If Primary dies, the Sequencer (or manual switch) points traffic to Standby. Standby enables output.
*   **Terraform:** Use Terraform to spin up identical infrastructure in both clouds to prevent "Cloud Vendor Lock-in" and ensure disaster recovery capability.

## 4. Upgrade Strategy (The "Snapshot & Roll")
How to upgrade a stateful C++ engine without downtime?

1.  **Snapshot:** The engine periodically writes a full state snapshot (OrderBook + Account Balances) to disk/S3 (e.g., every 1 minute) and appends inputs to a persistent log (WAL).
2.  **Restart (Maintenance Window):**
    *   Pause Inputs (buffer at Gateway).
    *   Snapshot State.
    *   Kill Old Process.
    *   Start New Binary.
    *   Load Snapshot + Replay WAL.
    *   Resume Inputs.
    *   *Total Time:* < 1-2 seconds (per symbol).

## 5. Summary Table

| Component | Deployment | Scaling Strategy | State |
| :--- | :--- | :--- | :--- |
| **Matching Engine (C++)** | **Bare Metal / Systemd** | Sharding by Symbol (Vertical Scaling per shard) | **Stateful** (In-Memory) |
| **Sequencer/Gateway** | **Kubernetes** | Horizontal Scaling (Load Balancer) | Stateless (Routes traffic) |
| **Settlement Relayer** | **Kubernetes** | Horizontal (1 per shard) | Stateless (Reads stream) |
| **Market Data** | **Kubernetes + Redis** | Horizontal (Fan-out) | Cached (Redis) |
| **Vault/Solana** | **Blockchain** | Network Limits | On-Chain |
