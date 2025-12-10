## 7. Data Architecture

### On-Chain State Management

All critical trading state is stored on the Solana blockchain for transparency, immutability, and non-custodial guarantees.

#### Position Accounts

```rust
// PDA: [b"position", user.key(), market.key()]
#[account]
pub struct UserPosition {
    // Identity
    pub owner: Pubkey,                  // 32 bytes
    pub parent_wallet: Pubkey,          // 32 bytes (if ephemeral)
    pub market: Pubkey,                 // 32 bytes
    
    // Position data
    pub size: i64,                      // 8 bytes (signed for long/short)
    pub entry_price: u64,               // 8 bytes (scaled by 1e6)
    pub collateral: u64,                // 8 bytes (USDT, scaled by 1e6)
    pub leverage: u16,                  // 2 bytes
    
    // Risk metrics
    pub liquidation_price: u64,         // 8 bytes
    pub maintenance_margin: u64,        // 8 bytes
    
    // PnL tracking
    pub realized_pnl: i64,              // 8 bytes
    pub unrealized_pnl: i64,            // 8 bytes
    
    // Funding tracking
    pub funding_index: i64,             // 8 bytes
    pub accumulated_funding: i64,       // 8 bytes
    pub last_funding_update: i64,       // 8 bytes
    
    // Timestamps
    pub open_timestamp: i64,            // 8 bytes
    pub last_update_timestamp: i64,     // 8 bytes
    
    pub bump: u8,                       // 1 byte
}
// Total: ~233 bytes + padding = 256 bytes

// Rent calculation: 
// 256 bytes = 0.00179088 SOL (~$0.30 at $170/SOL)
```

#### Vault Accounts

```rust
// PDA: [b"vault", user.key()]
#[account]
pub struct EphemeralVault {
    pub user_wallet: Pubkey,            // 32 bytes
    pub vault_pda: Pubkey,              // 32 bytes
    pub created_at: i64,                // 8 bytes
    pub last_activity: i64,             // 8 bytes
    
    // Delegate approval tracking
    pub approved_amount: u64,           // 8 bytes (USDT)
    pub used_amount: u64,               // 8 bytes
    pub available_amount: u64,          // 8 bytes
    
    // Status
    pub is_active: bool,                // 1 byte
    pub bump: u8,                       // 1 byte
}
// Total: ~106 bytes = 128 bytes allocated

// Associated token account for USDT: additional ~165 bytes
```

#### Settlement Batch Accounts

```rust
// PDA: [b"batch", batch_id]
#[account]
pub struct SettlementBatch {
    pub batch_id: [u8; 32],             // 32 bytes
    pub relayer: Pubkey,                // 32 bytes
    pub timestamp: i64,                 // 8 bytes
    pub trade_count: u16,               // 2 bytes
    pub merkle_root: [u8; 32],          // 32 bytes
    pub status: SettlementStatus,       // 1 byte
    pub bump: u8,                       // 1 byte
}
// Total: ~108 bytes = 128 bytes allocated

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum SettlementStatus {
    Pending,
    Confirmed,
    Failed,
}
```

#### Market Configuration Accounts

```rust
// PDA: [b"market", symbol_hash]
#[account]
pub struct PerpMarket {
    pub authority: Pubkey,              // 32 bytes
    pub market_id: Pubkey,              // 32 bytes
    pub symbol: [u8; 32],               // 32 bytes
    pub base_asset: [u8; 16],           // 16 bytes
    pub quote_asset: [u8; 16],          // 16 bytes
    
    // Vault and oracle
    pub usdt_vault: Pubkey,             // 32 bytes
    pub price_oracle: Pubkey,           // 32 bytes
    
    // Market parameters
    pub max_leverage: u16,              // 2 bytes
    pub maintenance_margin_ratio: u16,  // 2 bytes
    pub initial_margin_ratio: u16,      // 2 bytes
    pub maker_fee: i16,                 // 2 bytes
    pub taker_fee: u16,                 // 2 bytes
    
    // Market state
    pub funding_rate: i64,              // 8 bytes
    pub last_funding_update: i64,       // 8 bytes
    pub total_open_interest: u64,       // 8 bytes
    pub total_long_interest: u64,       // 8 bytes
    pub total_short_interest: u64,      // 8 bytes
    
    // Insurance and fees
    pub insurance_fund: Pubkey,         // 32 bytes
    pub fee_recipient: Pubkey,          // 32 bytes
    
    // Status
    pub is_active: bool,                // 1 byte
    pub bump: u8,                       // 1 byte
}
// Total: ~328 bytes = 384 bytes allocated
```

---

### Off-Chain Storage

Off-chain databases handle high-frequency data that doesn't require blockchain immutability.

#### PostgreSQL Schema

**Accounts Table:**
```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(64),
    verification_expiry BIGINT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    backup_codes TEXT[],
    linked_wallet VARCHAR(44),
    status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
    created_at BIGINT NOT NULL,
    verified_at BIGINT,
    wallet_linked_at BIGINT,
    two_factor_enabled_at BIGINT,
    
    INDEX idx_email (email),
    INDEX idx_linked_wallet (linked_wallet),
    INDEX idx_status (status)
);
```

**Orders Table:**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id),
    wallet_address VARCHAR(44) NOT NULL,
    is_ephemeral BOOLEAN DEFAULT FALSE,
    
    -- Order details
    symbol VARCHAR(32) NOT NULL,
    side VARCHAR(4) NOT NULL, -- BUY/SELL
    order_type VARCHAR(20) NOT NULL,
    size DECIMAL(20, 8) NOT NULL,
    limit_price DECIMAL(20, 6),
    
    -- Time in force
    time_in_force VARCHAR(10) NOT NULL,
    expiry_time BIGINT,
    
    -- Order attributes
    all_or_none BOOLEAN DEFAULT FALSE,
    min_quantity DECIMAL(20, 8),
    nbbo_protection BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) NOT NULL,
    filled_size DECIMAL(20, 8) DEFAULT 0,
    avg_fill_price DECIMAL(20, 6) DEFAULT 0,
    
    -- Timestamps
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    completed_at BIGINT,
    
    INDEX idx_user_symbol (user_id, symbol),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_symbol_status (symbol, status)
);
```

**Trades Table:**
```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(32) NOT NULL,
    
    -- Counterparties
    buyer_id UUID NOT NULL REFERENCES accounts(id),
    seller_id UUID NOT NULL REFERENCES accounts(id),
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    
    -- Trade details
    price DECIMAL(20, 6) NOT NULL,
    size DECIMAL(20, 8) NOT NULL,
    buyer_fee DECIMAL(20, 6) NOT NULL,
    seller_fee DECIMAL(20, 6) NOT NULL,
    
    -- Settlement
    status VARCHAR(20) NOT NULL,
    batch_id VARCHAR(64),
    tx_signature VARCHAR(88),
    settled_at BIGINT,
    
    -- Timestamp
    executed_at BIGINT NOT NULL,
    
    INDEX idx_buyer (buyer_id, executed_at),
    INDEX idx_seller (seller_id, executed_at),
    INDEX idx_symbol (symbol, executed_at),
    INDEX idx_batch (batch_id),
    INDEX idx_status (status)
);
```

**Positions Table (Mirror of On-Chain):**
```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES accounts(id),
    wallet_address VARCHAR(44) NOT NULL,
    market_address VARCHAR(44) NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    
    -- Position data (synced from chain)
    size DECIMAL(20, 8) NOT NULL,
    entry_price DECIMAL(20, 6) NOT NULL,
    collateral DECIMAL(20, 6) NOT NULL,
    leverage SMALLINT NOT NULL,
    liquidation_price DECIMAL(20, 6) NOT NULL,
    
    -- PnL
    realized_pnl DECIMAL(20, 6) DEFAULT 0,
    unrealized_pnl DECIMAL(20, 6) DEFAULT 0,
    
    -- Funding
    accumulated_funding DECIMAL(20, 6) DEFAULT 0,
    last_funding_update BIGINT,
    
    -- Status
    status VARCHAR(20) NOT NULL,
    open_timestamp BIGINT NOT NULL,
    last_update_timestamp BIGINT,
    closed_at BIGINT,
    
    -- Sync tracking
    last_synced_at BIGINT,
    on_chain_signature VARCHAR(88),
    
    INDEX idx_user_symbol (user_id, symbol),
    INDEX idx_wallet (wallet_address),
    INDEX idx_status (status),
    INDEX idx_open_timestamp (open_timestamp)
);
```

**Funding Rate History:**
```sql
CREATE TABLE funding_rates (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL,
    timestamp BIGINT NOT NULL,
    funding_rate DECIMAL(20, 10) NOT NULL,
    premium_index DECIMAL(20, 10) NOT NULL,
    mark_price DECIMAL(20, 6) NOT NULL,
    index_price DECIMAL(20, 6) NOT NULL,
    
    INDEX idx_symbol_timestamp (symbol, timestamp),
    UNIQUE (symbol, timestamp)
);

-- Partition by month for performance
CREATE TABLE funding_rates_2025_01 PARTITION OF funding_rates
    FOR VALUES FROM (1704067200000) TO (1706745600000);
```

**API Keys Table:**
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    secret_key_hash VARCHAR(255) NOT NULL,
    passphrase VARCHAR(255) NOT NULL,
    ip_whitelist TEXT[],
    permissions TEXT[] NOT NULL,
    created_at BIGINT NOT NULL,
    last_used_at BIGINT,
    expires_at BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_account (account_id),
    INDEX idx_api_key (api_key)
);
```

**Activity Logs:**
```sql
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    action VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_info JSONB,
    location JSONB,
    success BOOLEAN NOT NULL,
    metadata JSONB,
    
    INDEX idx_account_timestamp (account_id, timestamp),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Partition by week
CREATE TABLE activity_logs_2025_w01 PARTITION OF activity_logs
    FOR VALUES FROM (1704067200000) TO (1704672000000);
```

---

### Redis Data Structures

#### Order Book (Per Symbol)

```typescript
// Redis sorted sets for price-time priority
const orderBookStructure = {
    // Buy orders sorted by price (highest first)
    [`orderbook:${symbol}:buy`]: {
        type: 'ZSET',
        score: 'price',
        members: 'orderId'
    },
    
    // Sell orders sorted by price (lowest first)
    [`orderbook:${symbol}:sell`]: {
        type: 'ZSET',
        score: 'price',
        members: 'orderId'
    },
    
    // Order details
    [`order:${orderId}`]: {
        type: 'HASH',
        fields: {
            userId: 'uuid',
            symbol: 'string',
            side: 'BUY|SELL',
            orderType: 'string',
            size: 'number',
            limitPrice: 'number',
            filledSize: 'number',
            status: 'string',
            timestamp: 'number'
        },
        ttl: 86400 // 24 hours
    }
};
```

#### Price Cache

```typescript
// Latest prices for each symbol
const priceCache = {
    [`price:${symbol}:mark`]: {
        type: 'STRING',
        value: 'number',
        ttl: 1 // 1 second
    },
    
    [`price:${symbol}:index`]: {
        type: 'STRING',
        value: 'number',
        ttl: 1
    },
    
    // Price history (last 300 seconds)
    [`price:${symbol}:history`]: {
        type: 'ZSET',
        score: 'timestamp',
        members: 'price',
        maxLen: 300
    }
};
```

#### Session Cache

```typescript
const sessionCache = {
    [`session:${accessToken}`]: {
        type: 'HASH',
        fields: {
            accountId: 'uuid',
            email: 'string',
            walletAddress: 'string',
            role: 'string'
        },
        ttl: 900 // 15 minutes (access token expiry)
    },
    
    [`user:${accountId}:positions`]: {
        type: 'HASH',
        fields: {
            [symbol]: 'positionData'
        },
        ttl: 60 // 1 minute
    }
};
```

#### Rate Limiting

```typescript
const rateLimiting = {
    [`ratelimit:${userId}:${minute}`]: {
        type: 'STRING',
        value: 'count',
        ttl: 60
    },
    
    [`ratelimit:ws:${userId}:${second}`]: {
        type: 'STRING',
        value: 'count',
        ttl: 1
    }
};
```

---

### Real-Time Data Feeds (WebSocket Architecture)

#### WebSocket Server Structure

```typescript
class WebSocketServer {
    private connections: Map<string, WebSocket> = new Map();
    private subscriptions: Map<string, Set<string>> = new Map();
    private redis: Redis;
    
    async handleConnection(ws: WebSocket, request: Request): Promise<void> {
        const connectionId = crypto.randomUUID();
        this.connections.set(connectionId, ws);
        
        ws.on('message', async (message) => {
            await this.handleMessage(connectionId, message);
        });
        
        ws.on('close', () => {
            this.handleDisconnect(connectionId);
        });
    }
    
    async handleMessage(connectionId: string, message: any): Promise<void> {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'subscribe':
                await this.handleSubscribe(connectionId, data.channels);
                break;
            case 'unsubscribe':
                await this.handleUnsubscribe(connectionId, data.channels);
                break;
            case 'ping':
                this.send(connectionId, { type: 'pong' });
                break;
        }
    }
    
    async handleSubscribe(connectionId: string, channels: string[]): Promise<void> {
        for (const channel of channels) {
            if (!this.subscriptions.has(channel)) {
                this.subscriptions.set(channel, new Set());
                
                // Subscribe to Redis pub/sub
                await this.redis.subscribe(channel);
            }
            
            this.subscriptions.get(channel)!.add(connectionId);
        }
    }
    
    async publishUpdate(channel: string, data: any): Promise<void> {
        // Publish to Redis (fan-out to all WS servers)
        await this.redis.publish(channel, JSON.stringify(data));
    }
    
    private async handleRedisMessage(channel: string, message: string): Promise<void> {
        const subscribers = this.subscriptions.get(channel);
        if (!subscribers) return;
        
        const data = JSON.parse(message);
        
        for (const connectionId of subscribers) {
            this.send(connectionId, data);
        }
    }
}
```

#### Channel Structure

```typescript
const channels = {
    // Market data
    'trades:{symbol}': 'Trade executions',
    'funding:{symbol}': 'Funding rate updates',
    'liquidations:{symbol}': 'Liquidation events',
    
    // User-specific (authenticated)
    'positions:{userId}': 'Position updates',
    'orders:{userId}': 'Order status changes',
    'wallet:{userId}': 'Balance changes',
    
    // System-wide
    'system:status': 'System status updates',
    'system:maintenance': 'Maintenance notifications'
};
```

---

### Historical Data Retention Policies

```typescript
interface RetentionPolicy {
    dataType: string;
    hotStorage: string;      // Fast access
    warmStorage: string;     // Medium access
    coldStorage: string;     // Archive
    deletion: string;        // Permanent deletion
}

const RETENTION_POLICIES: RetentionPolicy[] = [
    {
        dataType: 'trades',
        hotStorage: '7 days (PostgreSQL)',
        warmStorage: '90 days (PostgreSQL)',
        coldStorage: '7 years (S3/Archive)',
        deletion: 'Never (regulatory requirement)'
    },
    {
        dataType: 'orders',
        hotStorage: '7 days (PostgreSQL)',
        warmStorage: '90 days (PostgreSQL)',
        coldStorage: '2 years (S3)',
        deletion: 'After 7 years'
    },
    {
        dataType: 'positions',
        hotStorage: '30 days (PostgreSQL)',
        warmStorage: '1 year (PostgreSQL)',
        coldStorage: '7 years (S3)',
        deletion: 'Never (regulatory requirement)'
    },
    {
        dataType: 'funding_rates',
        hotStorage: '30 days (PostgreSQL)',
        warmStorage: '1 year (PostgreSQL)',
        coldStorage: 'Indefinite (S3)',
        deletion: 'Never (historical reference)'
    },
    {
        dataType: 'activity_logs',
        hotStorage: '30 days (PostgreSQL)',
        warmStorage: '6 months (PostgreSQL)',
        coldStorage: '2 years (S3)',
        deletion: 'After 7 years'
    },
    {
        dataType: 'liquidations',
        hotStorage: '30 days (PostgreSQL)',
        warmStorage: '1 year (PostgreSQL)',
        coldStorage: 'Indefinite (S3)',
        deletion: 'Never (audit trail)'
    }
];
```

---

### Caching Strategy

#### Multi-Layer Caching

```typescript
class CacheManager {
    private l1Cache: NodeCache;         // In-memory (Node.js)
    private l2Cache: Redis;             // Redis
    private l3Cache: PostgreSQL;        // Database
    
    async get(key: string): Promise<any> {
        // L1: In-memory cache (fastest)
        let value = this.l1Cache.get(key);
        if (value !== undefined) {
            return value;
        }
        
        // L2: Redis cache (fast)
        value = await this.l2Cache.get(key);
        if (value !== null) {
            this.l1Cache.set(key, value, 60); // Cache for 1 min
            return JSON.parse(value);
        }
        
        // L3: Database (slower)
        value = await this.fetchFromDatabase(key);
        if (value !== null) {
            await this.l2Cache.setex(key, 300, JSON.stringify(value)); // 5 min
            this.l1Cache.set(key, value, 60);
            return value;
        }
        
        return null;
    }
    
    async set(key: string, value: any, ttl?: number): Promise<void> {
        // Write to all layers
        this.l1Cache.set(key, value, ttl || 60);
        await this.l2Cache.setex(key, ttl || 300, JSON.stringify(value));
        
        // Database is source of truth, updated separately
    }
    
    async invalidate(key: string): Promise<void> {
        this.l1Cache.del(key);
        await this.l2Cache.del(key);
    }
}
```

#### Cache Warming

```typescript
class CacheWarmer {
    async warmCaches(): Promise<void> {
        // Warm price cache
        const symbols = await this.getAllSymbols();
        for (const symbol of symbols) {
            const price = await this.fetchPrice(symbol);
            await this.cache.set(`price:${symbol}:mark`, price);
        }
        
        // Warm top positions
        const activeUsers = await this.getActiveUsers();
        for (const userId of activeUsers) {
            const positions = await this.fetchPositions(userId);
            await this.cache.set(`user:${userId}:positions`, positions);
        }
        
        // Warm market stats
        for (const symbol of symbols) {
            const stats = await this.calculateMarketStats(symbol);
            await this.cache.set(`stats:${symbol}`, stats);
        }
    }
}
```

---

### Data Backup and Recovery

#### Backup Strategy

```typescript
interface BackupPlan {
    source: string;
    destination: string;
    frequency: string;
    retention: string;
    encryption: boolean;
}

const BACKUP_PLANS: BackupPlan[] = [
    {
        source: 'PostgreSQL (Hot)',
        destination: 'S3 + Glacier',
        frequency: 'Every 6 hours',
        retention: '30 days hot, 1 year glacier',
        encryption: true
    },
    {
        source: 'Redis (State)',
        destination: 'S3',
        frequency: 'Every 1 hour',
        retention: '7 days',
        encryption: true
    },
    {
        source: 'Smart Contract State',
        destination: 'Archive Node + S3',
        frequency: 'Real-time (automatic)',
        retention: 'Indefinite',
        encryption: false // Public blockchain
    }
];
```

#### Disaster Recovery

```typescript
class DisasterRecovery {
    async createBackup(): Promise<string> {
        const backupId = `backup-${Date.now()}`;
        
        // 1. Dump PostgreSQL
        await exec(`pg_dump -Fc godark_db > /backups/${backupId}/postgres.dump`);
        
        // 2. Snapshot Redis
        await this.redis.bgsave();
        await exec(`cp /var/lib/redis/dump.rdb /backups/${backupId}/redis.rdb`);
        
        // 3. Export Solana account snapshots
        await this.exportSolanaAccounts(backupId);
        
        // 4. Compress and encrypt
        await exec(`tar -czf /backups/${backupId}.tar.gz /backups/${backupId}`);
        await exec(`openssl enc -aes-256-cbc -salt -in /backups/${backupId}.tar.gz -out /backups/${backupId}.enc`);
        
        // 5. Upload to S3
        await this.s3.upload({
            Bucket: 'godark-backups',
            Key: `${backupId}.enc`,
            Body: fs.createReadStream(`/backups/${backupId}.enc`)
        });
        
        return backupId;
    }
    
    async restoreFromBackup(backupId: string): Promise<void> {
        // 1. Download from S3
        await this.s3.download(backupId);
        
        // 2. Decrypt and extract
        await exec(`openssl enc -aes-256-cbc -d -in ${backupId}.enc -out ${backupId}.tar.gz`);
        await exec(`tar -xzf ${backupId}.tar.gz`);
        
        // 3. Restore PostgreSQL
        await exec(`pg_restore -d godark_db ${backupId}/postgres.dump`);
        
        // 4. Restore Redis
        await exec(`cp ${backupId}/redis.rdb /var/lib/redis/dump.rdb`);
        await this.redis.shutdown();
        await this.redis.start();
        
        // 5. Verify data integrity
        await this.verifyRestore();
    }
    
    async performDRDrill(): Promise<DRTestReport> {
        // Regular disaster recovery testing
        const testId = `dr-test-${Date.now()}`;
        
        // Create test backup
        const backupId = await this.createBackup();
        
        // Spin up test environment
        const testEnv = await this.createTestEnvironment();
        
        // Restore to test environment
        await this.restoreToEnvironment(testEnv, backupId);
        
        // Verify functionality
        const verifications = await this.runVerificationTests(testEnv);
        
        // Cleanup
        await this.destroyTestEnvironment(testEnv);
        
        return {
            testId,
            timestamp: Date.now(),
            backupId,
            success: verifications.every(v => v.passed),
            duration: verifications.reduce((acc, v) => acc + v.duration, 0),
            results: verifications
        };
    }
}
```

---


