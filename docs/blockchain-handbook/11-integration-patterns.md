# Integration Patterns for GoDark DEX

## Overview

This guide covers how GoDark DEX components integrate with each other, external services, and the Solana blockchain. Understanding these patterns is essential for building cohesive, well-integrated components.

---

## Component Communication Patterns

### On-Chain Communication (CPIs)

**Pattern:** Cross-Program Invocations

**Example: Position Management → Collateral Vault**
```rust
// Position Management program calls Collateral Vault
pub fn lock_collateral(ctx: Context<LockCollateral>, amount: u64) -> Result<()> {
    let cpi_accounts = LockCollateralAccounts {
        vault: ctx.accounts.vault.to_account_info(),
        user_token: ctx.accounts.user_token.to_account_info(),
        vault_token: ctx.accounts.vault_token.to_account_info(),
        authority: ctx.accounts.position_pda.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.collateral_vault_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    // Sign with position PDA
    let seeds = &[
        b"position",
        ctx.accounts.user.key().as_ref(),
        &[ctx.bumps.position],
    ];
    let cpi_ctx = cpi_ctx.with_signer(&[&seeds[..]]);
    
    collateral_vault::cpi::lock_collateral(cpi_ctx, amount)?;
    Ok(())
}
```

### Off-Chain Communication (APIs)

**Pattern:** REST API calls between services

**Example: Settlement Relayer → Position Management Service**
```rust
use reqwest::Client;

pub struct PositionServiceClient {
    client: Client,
    base_url: String,
}

impl PositionServiceClient {
    pub async fn get_position(&self, position_id: &str) -> Result<Position> {
        let url = format!("{}/positions/{}", self.base_url, position_id);
        let response = self.client.get(&url).send().await?;
        let position: Position = response.json().await?;
        Ok(position)
    }
    
    pub async fn update_position(&self, update: PositionUpdate) -> Result<()> {
        let url = format!("{}/positions", self.base_url);
        self.client.post(&url).json(&update).send().await?;
        Ok(())
    }
}
```

---

## API Integration

### REST API Patterns

**Standard Endpoints:**
```rust
use axum::{Router, Json, extract::Path};

pub fn create_api_router() -> Router {
    Router::new()
        .route("/api/positions", post(create_position))
        .route("/api/positions/:id", get(get_position))
        .route("/api/positions/:id", put(update_position))
        .route("/api/positions/:id", delete(close_position))
        .route("/api/funding-rates", get(get_funding_rates))
        .route("/api/liquidations", get(get_liquidations))
}

async fn get_position(Path(id): Path<String>) -> Json<Position> {
    // Fetch position from database
    let position = db.get_position(&id).await.unwrap();
    Json(position)
}
```

**Error Handling:**
```rust
use axum::response::IntoResponse;

pub enum ApiError {
    NotFound(String),
    BadRequest(String),
    InternalError(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };
        
        (status, Json(json!({"error": message}))).into_response()
    }
}
```

### WebSocket Integration

**Real-Time Updates:**
```rust
use tokio_tungstenite::{WebSocketStream, MaybeTlsStream};
use futures_util::{SinkExt, StreamExt};

pub async fn handle_websocket(
    stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
) {
    let (mut sender, mut receiver) = stream.split();
    
    // Subscribe to updates
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                let request: WebSocketRequest = serde_json::from_str(&text)?;
                
                match request {
                    WebSocketRequest::SubscribePosition { position_id } => {
                        subscribe_to_position(&mut sender, position_id).await?;
                    }
                    WebSocketRequest::SubscribeMarket { market } => {
                        subscribe_to_market(&mut sender, market).await?;
                    }
                }
            }
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }
}
```

---

## Database Integration Patterns

### Connection Pooling

**PostgreSQL Pool:**
```rust
use sqlx::postgres::{PgPool, PgPoolOptions};

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await?;
    
    Ok(pool)
}
```

### Transaction Management

**Database Transactions:**
```rust
pub async fn create_position_with_trade(
    pool: &PgPool,
    position: &Position,
    trade: &Trade,
) -> Result<()> {
    let mut tx = pool.begin().await?;
    
    // Insert position
    sqlx::query!(
        "INSERT INTO positions (id, user_pubkey, size, ...) VALUES ($1, $2, $3, ...)",
        position.id,
        position.user_pubkey,
        position.size,
    )
    .execute(&mut *tx)
    .await?;
    
    // Insert trade
    sqlx::query!(
        "INSERT INTO trades (id, position_id, size, price, ...) VALUES ($1, $2, $3, $4, ...)",
        trade.id,
        trade.position_id,
        trade.size,
        trade.price,
    )
    .execute(&mut *tx)
    .await?;
    
    // Commit transaction
    tx.commit().await?;
    Ok(())
}
```

### Query Optimization

**Efficient Queries:**
```rust
// Use prepared statements
pub async fn get_user_positions(
    pool: &PgPool,
    user_pubkey: &str,
) -> Result<Vec<Position>> {
    let positions = sqlx::query_as!(
        Position,
        "SELECT * FROM positions WHERE user_pubkey = $1 AND status = 'open'",
        user_pubkey
    )
    .fetch_all(pool)
    .await?;
    
    Ok(positions)
}

// Use indexes
// CREATE INDEX idx_user_status ON positions(user_pubkey, status);
```

---

## Oracle Integration

### Pyth Network Integration

**Price Fetching:**
```rust
use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;

pub struct PythClient {
    rpc_client: RpcClient,
    price_feed_ids: HashMap<String, Pubkey>,
}

impl PythClient {
    pub async fn get_price(&self, symbol: &str) -> Result<PriceData> {
        let feed_id = self.price_feed_ids.get(symbol)
            .ok_or_else(|| anyhow!("Unknown symbol: {}", symbol))?;
        
        let account_info = self.rpc_client.get_account(feed_id).await?;
        let price_data = parse_price_account(&account_info.data)?;
        
        Ok(PriceData {
            price: price_data.price,
            confidence: price_data.confidence,
            timestamp: price_data.publish_time,
        })
    }
}
```

### Switchboard Fallback

**Multi-Oracle Pattern:**
```rust
pub async fn get_consensus_price(
    symbol: &str,
    pyth_client: &PythClient,
    switchboard_client: &SwitchboardClient,
) -> Result<u64> {
    // Try Pyth first
    let pyth_price = match pyth_client.get_price(symbol).await {
        Ok(price) => Some(price),
        Err(_) => None,
    };
    
    // Fallback to Switchboard
    let switchboard_price = match switchboard_client.get_price(symbol).await {
        Ok(price) => Some(price),
        Err(_) => None,
    };
    
    // Use consensus
    match (pyth_price, switchboard_price) {
        (Some(p), Some(s)) => {
            // Use median
            let prices = vec![p.price, s.price];
            prices.sort();
            Ok(prices[prices.len() / 2])
        }
        (Some(p), None) => Ok(p.price),
        (None, Some(s)) => Ok(s.price),
        (None, None) => Err(anyhow!("No oracle data available")),
    }
}
```

---

## Wallet Integration

### Phantom Wallet

**Frontend Integration:**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';

function TradingInterface() {
    const { publicKey, signTransaction, connected } = useWallet();
    
    const openPosition = async (size: number, leverage: number) => {
        if (!publicKey || !signTransaction) return;
        
        // Build transaction
        const transaction = await buildOpenPositionTransaction(
            publicKey,
            size,
            leverage
        );
        
        // Sign and send
        const signed = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);
    };
    
    return (
        <button onClick={() => openPosition(1000, 10)}>
            Open Position
        </button>
    );
}
```

### Solflare Integration

**Similar Pattern:**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';

// Same API as Phantom
const { publicKey, signTransaction } = useWallet();
```

---

## Cross-Component Data Flow

### Position Lifecycle Flow

```
User Request
    ↓
Matching Engine (off-chain)
    ↓
Settlement Relayer
    ├─→ Batch Accumulation
    ├─→ Merkle Tree Generation
    └─→ Transaction Building
    ↓
Position Management (on-chain)
    ├─→ Create/Update Position Account
    ├─→ Lock Collateral (CPI → Collateral Vault)
    └─→ Emit PositionUpdated Event
    ↓
Off-Chain Services
    ├─→ Position Service (update database)
    ├─→ Liquidation Engine (monitor position)
    └─→ WebSocket (notify clients)
```

### Funding Rate Flow

```
Oracle Integration
    ├─→ Fetch Mark Price (Pyth/Switchboard)
    └─→ Fetch Index Price
    ↓
Funding Rate Service
    ├─→ Calculate Premium Index
    ├─→ Calculate Interest Rate
    ├─→ Calculate Funding Rate (every 1 second)
    └─→ Aggregate Hourly
    ↓
On-Chain Distribution
    ├─→ Position Management (apply payments)
    └─→ Update Position Collateral
    ↓
Events
    └─→ FundingRatePaid Event
```

---

## Error Propagation and Handling

### Error Types

**Define Error Types:**
```rust
#[derive(Debug, thiserror::Error)]
pub enum IntegrationError {
    #[error("Oracle error: {0}")]
    OracleError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("RPC error: {0}")]
    RpcError(#[from] solana_client::client_error::ClientError),
    
    #[error("Transaction failed: {0}")]
    TransactionError(String),
}
```

### Error Handling Pattern

**Propagate Errors:**
```rust
pub async fn process_settlement(
    trades: &[Trade],
) -> Result<()> {
    // Try settlement
    let result = submit_settlement_transaction(trades).await;
    
    match result {
        Ok(signature) => {
            // Update database
            db.mark_trades_settled(trades, &signature).await?;
            Ok(())
        }
        Err(e) => {
            // Log error
            error!("Settlement failed: {}", e);
            
            // Retry logic
            if should_retry(&e) {
                retry_settlement(trades).await
            } else {
                Err(IntegrationError::TransactionError(e.to_string()))
            }
        }
    }
}
```

---

## Transaction Dependency Management

### Transaction Ordering

**Dependencies:**
```rust
pub struct TransactionDependency {
    pub depends_on: Vec<Signature>,
    pub transaction: Transaction,
}

pub async fn execute_with_dependencies(
    dependencies: Vec<TransactionDependency>,
) -> Result<()> {
    // Topological sort
    let sorted = topological_sort(dependencies)?;
    
    // Execute in order
    for dep in sorted.iter() {
        // Wait for dependencies
        for sig in dep.depends_on.iter() {
            wait_for_confirmation(sig).await?;
        }
        
        // Execute transaction
        execute_transaction(&dep.transaction).await?;
    }
    
    Ok(())
}
```

---

## Event Coordination

### Event Bus Pattern

**Central Event Bus:**
```rust
use tokio::sync::broadcast;

pub struct EventBus {
    sender: broadcast::Sender<Event>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self { sender }
    }
    
    pub fn publish(&self, event: Event) -> Result<()> {
        self.sender.send(event)?;
        Ok(())
    }
    
    pub fn subscribe(&self) -> broadcast::Receiver<Event> {
        self.sender.subscribe()
    }
}
```

**Event Handlers:**
```rust
pub async fn handle_position_events(mut receiver: broadcast::Receiver<Event>) {
    while let Ok(event) = receiver.recv().await {
        match event {
            Event::PositionOpened { position_id, .. } => {
                // Update database
                db.create_position(position_id).await?;
                
                // Notify liquidation engine
                liquidation_engine.monitor_position(position_id).await?;
            }
            Event::PositionClosed { position_id, .. } => {
                // Update database
                db.close_position(position_id).await?;
                
                // Stop monitoring
                liquidation_engine.stop_monitoring(position_id).await?;
            }
            _ => {}
        }
    }
}
```

---

## Integration Testing Strategies

### Mock External Services

**Mock Oracle:**
```rust
pub struct MockOracle {
    prices: HashMap<String, u64>,
}

impl OracleClient for MockOracle {
    async fn get_price(&self, symbol: &str) -> Result<PriceData> {
        let price = self.prices.get(symbol)
            .ok_or_else(|| anyhow!("Price not found"))?;
        
        Ok(PriceData {
            price: *price,
            confidence: 100,
            timestamp: Utc::now().timestamp(),
        })
    }
}
```

### Integration Test Setup

**Test Environment:**
```rust
#[tokio::test]
async fn test_position_lifecycle() {
    // Setup test database
    let db = setup_test_database().await;
    
    // Setup mock oracle
    let oracle = MockOracle::new();
    oracle.set_price("BTC", 50000);
    
    // Setup test RPC
    let rpc = setup_test_rpc().await;
    
    // Test position creation
    let position = create_position(&db, &oracle, &rpc).await?;
    assert_eq!(position.size, 1000);
    
    // Test position update
    update_position(&db, &oracle, &rpc, position.id).await?;
    
    // Test position close
    close_position(&db, &oracle, &rpc, position.id).await?;
}
```

---

## Key Takeaways

1. **CPIs**: On-chain component communication
2. **REST APIs**: Off-chain service communication
3. **WebSockets**: Real-time updates
4. **Database**: Persistent state management
5. **Oracles**: Multi-source price feeds
6. **Wallets**: User interaction
7. **Error Handling**: Proper propagation
8. **Events**: Coordination mechanism

---

## Next Steps

- Review **[10-architecture-deep-dive.md](./10-architecture-deep-dive.md)** for architecture details
- Study your component's integration points
- Practice implementing integrations

---

**Last Updated:** January 2025

