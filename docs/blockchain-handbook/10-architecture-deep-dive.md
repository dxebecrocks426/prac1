# Architecture Deep Dive: GoDark DEX

## Overview

This guide provides a detailed look at the architectural patterns, design decisions, and implementation strategies used in GoDark DEX.

---

## Hybrid Architecture

### Off-Chain Matching, On-Chain Settlement

**Architecture Pattern:**
```
┌─────────────────────────────────────────────────────────┐
│              Off-Chain Layer (Fast)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Matching Engine                                 │   │
│  │  - Order book management                        │   │
│  │  - Price-time priority matching                 │   │
│  │  - Trade execution                              │   │
│  │  - 1000+ trades/second                          │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ Trades
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Settlement Relayer (Bridge)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Batch Accumulation                              │   │
│  │  - 1-second windows                              │   │
│  │  - Net position calculation                      │   │
│  │  - Merkle tree generation                         │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ Transactions
                     ▼
┌─────────────────────────────────────────────────────────┐
│            On-Chain Layer (Secure)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Solana Programs                                 │   │
│  │  - Position Management                           │   │
│  │  - Collateral Vault                              │   │
│  │  - Liquidation Engine                            │   │
│  │  - Funding Rate                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- **Speed**: Off-chain matching enables high throughput
- **Security**: On-chain settlement ensures trustlessness
- **Cost**: Batch settlement reduces transaction fees
- **Privacy**: Dark pool hides orders until execution

---

## Dark Pool Implementation Patterns

### Order Hiding

**Pattern:** Orders invisible until execution

**Implementation:**
```rust
// Off-chain order book (not visible to public)
pub struct OrderBook {
    orders: BTreeMap<Price, Vec<Order>>, // Price-time priority
    // Orders not exposed via API until matched
}

// Only matched trades are revealed
pub struct Trade {
    pub price: u64,
    pub size: u64,
    pub timestamp: i64,
    // No order IDs exposed
}
```

**Benefits:**
- Prevents front-running
- Reduces market impact
- Protects large orders

### Price-Time Priority Matching

**Algorithm:**
```rust
pub fn match_orders(order_book: &mut OrderBook, new_order: Order) -> Vec<Trade> {
    let mut trades = Vec::new();
    
    // Find matching orders (opposite side, best price)
    while let Some(matching_order) = order_book.find_best_match(&new_order) {
        let trade = execute_trade(&new_order, &matching_order);
        trades.push(trade);
        
        // Update order sizes
        new_order.size -= trade.size;
        matching_order.size -= trade.size;
        
        // Remove filled orders
        if matching_order.size == 0 {
            order_book.remove_order(matching_order);
        }
        if new_order.size == 0 {
            break;
        }
    }
    
    // Add remaining order to book
    if new_order.size > 0 {
        order_book.add_order(new_order);
    }
    
    trades
}
```

---

## Batch Settlement Design

### Merkle Trees

**Purpose:** Cryptographic verification of batch integrity

**Implementation:**
```rust
use sha2::{Sha256, Digest};

pub struct MerkleTree {
    leaves: Vec<[u8; 32]>, // Trade hashes
    root: [u8; 32],
}

impl MerkleTree {
    pub fn build(trades: &[Trade]) -> Self {
        let leaves: Vec<[u8; 32]> = trades.iter()
            .map(|trade| Self::hash_trade(trade))
            .collect();
        
        let root = Self::compute_root(&leaves);
        
        Self { leaves, root }
    }
    
    fn hash_trade(trade: &Trade) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(&trade.user.to_bytes());
        hasher.update(&trade.size.to_le_bytes());
        hasher.update(&trade.price.to_le_bytes());
        hasher.finalize().into()
    }
    
    fn compute_root(leaves: &[[u8; 32]]) -> [u8; 32] {
        // Build Merkle tree bottom-up
        let mut level = leaves.to_vec();
        
        while level.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in level.chunks(2) {
                if chunk.len() == 2 {
                    let hash = Self::hash_pair(&chunk[0], &chunk[1]);
                    next_level.push(hash);
                } else {
                    next_level.push(chunk[0]);
                }
            }
            level = next_level;
        }
        
        level[0]
    }
}
```

**On-Chain Verification:**
```rust
pub fn verify_settlement(
    ctx: Context<VerifySettlement>,
    merkle_root: [u8; 32],
    trade_proof: Vec<[u8; 32]>, // Merkle proof path
) -> Result<()> {
    // Verify trade is in batch
    let trade_hash = hash_trade(&ctx.accounts.trade);
    let computed_root = compute_root_from_proof(trade_hash, &trade_proof);
    
    require!(
        computed_root == merkle_root,
        ErrorCode::InvalidMerkleProof
    );
    
    // Process settlement
    settle_trade(ctx, &ctx.accounts.trade)?;
    Ok(())
}
```

### Netting

**Purpose:** Reduce on-chain operations

**Algorithm:**
```rust
pub struct NetPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub net_size: i64, // Positive = long, negative = short
    pub avg_entry_price: u64,
}

pub fn calculate_net_positions(trades: &[Trade]) -> Vec<NetPosition> {
    use std::collections::HashMap;
    
    let mut positions: HashMap<(Pubkey, Pubkey), NetPosition> = HashMap::new();
    
    for trade in trades.iter() {
        let key = (trade.user, trade.market);
        let position = positions.entry(key).or_insert_with(|| NetPosition {
            user: trade.user,
            market: trade.market,
            net_size: 0,
            avg_entry_price: 0,
        });
        
        // Update net size
        if trade.side == Side::Long {
            position.net_size += trade.size as i64;
        } else {
            position.net_size -= trade.size as i64;
        }
        
        // Update average entry price (weighted average)
        let total_notional = (position.net_size.abs() as u64)
            .checked_mul(position.avg_entry_price)
            .unwrap_or(0);
        let trade_notional = trade.size.checked_mul(trade.price).unwrap_or(0);
        
        let new_notional = if trade.side == Side::Long {
            total_notional.checked_add(trade_notional).unwrap_or(0)
        } else {
            total_notional.checked_sub(trade_notional).unwrap_or(0)
        };
        
        if position.net_size != 0 {
            position.avg_entry_price = new_notional
                .checked_div(position.net_size.abs() as u64)
                .unwrap_or(0);
        }
    }
    
    positions.into_values().collect()
}
```

**Benefits:**
- Reduces transaction size
- Lowers compute units
- Decreases fees

---

## State Management Strategies

### On-Chain vs Off-Chain State

**On-Chain State:**
- Position accounts
- Collateral balances
- Configuration
- Critical security parameters

**Off-Chain State:**
- Order book
- Trade history
- User preferences
- Analytics data

**Decision Criteria:**
- **On-Chain**: Security-critical, needs trustlessness
- **Off-Chain**: Performance-critical, can be rebuilt

### State Synchronization

**Pattern:** Event-driven synchronization

```rust
// On-chain event
#[event]
pub struct PositionUpdated {
    pub user: Pubkey,
    pub position_id: Pubkey,
    pub size: u64,
    pub collateral: u64,
}

// Off-chain listener
pub async fn sync_position(event: PositionUpdated) {
    // Update off-chain database
    db.update_position(event.position_id, event.size, event.collateral).await;
    
    // Update cache
    cache.set_position(event.position_id, event.size).await;
    
    // Notify WebSocket clients
    websocket.broadcast_position_update(event).await;
}
```

---

## Event-Driven Architecture

### WebSocket Notifications

**Implementation:**
```rust
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub struct WebSocketServer {
    clients: Arc<Mutex<HashMap<Uuid, Sender>>>,
}

impl WebSocketServer {
    pub async fn broadcast_position_update(&self, update: PositionUpdate) {
        let message = serde_json::to_string(&update).unwrap();
        let clients = self.clients.lock().await;
        
        for (_, sender) in clients.iter() {
            let _ = sender.send(Message::Text(message.clone())).await;
        }
    }
    
    pub async fn subscribe_to_market(&self, client_id: Uuid, market: String) {
        // Add client to market subscription list
    }
}
```

### Event Types

**Position Events:**
- Position opened
- Position modified
- Position closed
- Position liquidated

**Market Events:**
- Price updates
- Funding rate changes
- Liquidation alerts

**System Events:**
- Upgrades
- Pauses
- Parameter changes

---

## Database Design Patterns

### PostgreSQL Schema

**Positions Table:**
```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    user_pubkey TEXT NOT NULL,
    position_pda TEXT NOT NULL UNIQUE,
    market TEXT NOT NULL,
    size BIGINT NOT NULL,
    entry_price BIGINT NOT NULL,
    leverage SMALLINT NOT NULL,
    collateral BIGINT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    INDEX idx_user (user_pubkey),
    INDEX idx_market (market),
    INDEX idx_status (status)
);
```

**Trades Table:**
```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY,
    user_pubkey TEXT NOT NULL,
    market TEXT NOT NULL,
    side TEXT NOT NULL,
    size BIGINT NOT NULL,
    price BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    settlement_tx TEXT,
    merkle_root TEXT,
    INDEX idx_user (user_pubkey),
    INDEX idx_timestamp (timestamp),
    INDEX idx_settlement (settlement_tx)
);
```

### Query Patterns

**Efficient Queries:**
```sql
-- Get user positions
SELECT * FROM positions 
WHERE user_pubkey = $1 AND status = 'open'
ORDER BY created_at DESC;

-- Get liquidation candidates
SELECT * FROM positions
WHERE status = 'open' AND margin_ratio < 1.0
ORDER BY margin_ratio ASC
LIMIT 100;
```

---

## Caching Strategies

### Redis Caching

**Cache Current Prices:**
```rust
use redis::Commands;

pub struct PriceCache {
    client: redis::Client,
}

impl PriceCache {
    pub async fn set_price(&self, symbol: &str, price: u64) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let key = format!("price:{}", symbol);
        conn.set_ex(&key, price.to_string(), 60).await?; // 60s TTL
        Ok(())
    }
    
    pub async fn get_price(&self, symbol: &str) -> Result<Option<u64>> {
        let mut conn = self.client.get_async_connection().await?;
        let key = format!("price:{}", symbol);
        let value: Option<String> = conn.get(&key).await?;
        Ok(value.map(|v| v.parse().unwrap()))
    }
}
```

### In-Memory Caching

**Cache Position Data:**
```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct PositionCache {
    positions: Arc<RwLock<HashMap<Pubkey, Position>>>,
}

impl PositionCache {
    pub async fn get(&self, position_id: &Pubkey) -> Option<Position> {
        let positions = self.positions.read().await;
        positions.get(position_id).cloned()
    }
    
    pub async fn set(&self, position_id: Pubkey, position: Position) {
        let mut positions = self.positions.write().await;
        positions.insert(position_id, position);
    }
}
```

---

## Performance Optimization

### Compute Unit Optimization

**Techniques:**
1. **Batch Operations**: Process multiple items in one instruction
2. **Efficient Algorithms**: Use O(n log n) instead of O(n²)
3. **Early Returns**: Exit early when possible
4. **Cache Computations**: Store expensive calculations

**Example:**
```rust
// Optimized margin calculation
pub fn calculate_margin_ratio_batch(
    positions: &[Position],
    prices: &HashMap<Pubkey, u64>,
) -> Vec<u64> {
    positions.iter()
        .map(|pos| {
            let mark_price = prices.get(&pos.market).unwrap_or(&0);
            let unrealized_pnl = calculate_pnl(pos, *mark_price);
            let total_equity = pos.collateral as i64 + unrealized_pnl;
            (total_equity * 100) / pos.maintenance_margin
        })
        .collect()
}
```

### Transaction Batching

**Batch Multiple Operations:**
```rust
pub fn build_batch_transaction(
    operations: Vec<Operation>,
) -> Result<Transaction> {
    let mut instructions = Vec::new();
    
    // Set compute budget
    instructions.push(
        ComputeBudgetInstruction::set_compute_unit_limit(400_000)
    );
    
    // Add operations
    for op in operations.iter() {
        instructions.push(op.to_instruction()?);
    }
    
    // Build transaction
    let transaction = Transaction::new_with_payer(
        &instructions,
        Some(&payer.pubkey()),
    );
    
    Ok(transaction)
}
```

---

## Scalability Considerations

### Account Limits

**Constraints:**
- 64 accounts per transaction
- 1,232 bytes per transaction
- 1.4M compute units per transaction

**Solutions:**
- Batch operations
- Use PDAs efficiently
- Minimize account data size

### Throughput Optimization

**Techniques:**
1. **Parallel Processing**: Process multiple markets concurrently
2. **Connection Pooling**: Reuse database connections
3. **Async Operations**: Use async/await for I/O
4. **Load Balancing**: Distribute load across instances

---

## Monitoring and Observability

### Metrics

**Key Metrics:**
- Trades per second
- Settlement latency
- Liquidation rate
- Funding rate accuracy
- System uptime

**Implementation:**
```rust
use prometheus::{Counter, Histogram, Registry};

pub struct Metrics {
    trades_total: Counter,
    settlement_latency: Histogram,
    liquidations_total: Counter,
}

impl Metrics {
    pub fn record_trade(&self) {
        self.trades_total.inc();
    }
    
    pub fn record_settlement(&self, duration: Duration) {
        self.settlement_latency.observe(duration.as_secs_f64());
    }
}
```

### Logging

**Structured Logging:**
```rust
use tracing::{info, error, warn};

pub fn process_trade(trade: &Trade) -> Result<()> {
    info!(
        user = %trade.user,
        market = %trade.market,
        size = trade.size,
        price = trade.price,
        "Processing trade"
    );
    
    // ... process trade ...
    
    info!(
        trade_id = %trade.id,
        "Trade processed successfully"
    );
    
    Ok(())
}
```

---

## Key Takeaways

1. **Hybrid Architecture**: Off-chain speed, on-chain security
2. **Dark Pool**: Privacy through order hiding
3. **Batch Settlement**: Merkle trees + netting for efficiency
4. **State Management**: On-chain critical, off-chain performance
5. **Event-Driven**: WebSocket for real-time updates
6. **Caching**: Redis + in-memory for performance
7. **Optimization**: Compute units, transaction size, throughput
8. **Monitoring**: Metrics and logging for observability

---

## Next Steps

- Review **[11-integration-patterns.md](./11-integration-patterns.md)** for component integration
- Study your component's architecture in detail
- Understand data flow in your component

---

**Last Updated:** January 2025

