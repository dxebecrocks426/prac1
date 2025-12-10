## 12. Deployment & Operations

### Development Phases

#### Phase 1: Testnet Deployment (Months 1-2)

**Objectives:**
- Deploy all smart contracts to Solana Devnet
- Test core functionality in isolation
- Conduct internal security review
- Performance testing with simulated load

**Deliverables:**
```typescript
const PHASE_1_DELIVERABLES = {
    smartContracts: [
        'Market initialization',
        'Position management',
        'Vault operations',
        'Settlement logic',
        'Liquidation engine'
    ],
    backend: [
        'REST API (all endpoints)',
        'WebSocket server',
        'Matching engine',
        'Settlement relayer',
        'Liquidation monitor'
    ],
    infrastructure: [
        'Devnet RPC node',
        'PostgreSQL database',
        'Redis cluster',
        'Monitoring stack'
    ],
    testing: [
        'Unit tests (100% coverage)',
        'Integration tests',
        'Load tests (100 TPS)',
        'Security audit (preliminary)'
    ]
};
```

**Success Criteria:**
- All tests passing
- 100+ simulated users
- 1000+ test trades executed
- Zero critical bugs
- API latency < 100ms p95
- Settlement success rate > 99%

---

#### Phase 2: Mainnet Beta (Months 3-4)

**Objectives:**
- Deploy to Solana Mainnet with limited access
- Invite selected beta testers
- Test with real value (limited amounts)
- Monitor system behavior under real conditions

**Beta Program:**
```typescript
interface BetaProgram {
    participants: {
        internalTeam: 10,
        earlyAdopters: 50,
        marketMakers: 5,
        total: 65
    },
    limits: {
        maxDepositPerUser: 1000,      // USDT
        maxPositionSize: 500,         // USDT
        maxLeverage: 20,              // Conservative
        totalTVL: 50000               // USDT
    },
    monitoring: {
        24x7: true,
        manualApproval: true,
        emergencyPause: true
    }
}
```

**Beta Phases:**
```
Week 1-2: Internal testing (10 users, $10K TVL)
├── Core team trades
├── System monitoring
└── Bug fixes

Week 3-4: Limited beta (25 users, $25K TVL)
├── Invite early supporters
├── Collect feedback
└── Optimize UX

Week 5-6: Expanded beta (50 users, $50K TVL)
├── Add market makers
├── Increase limits
└── Stress testing

Week 7-8: Pre-launch prep
├── Final audit
├── Documentation
└── Marketing preparation
```

**Success Criteria:**
- Zero settlement failures
- No security incidents
- User feedback positive (>4/5 stars)
- All edge cases handled
- Ready for public launch

---

#### Phase 3: Full Production (Month 5+)

**Launch Checklist:**

```typescript
const LAUNCH_CHECKLIST = {
    technical: [
        '✓ Smart contracts audited (OtterSec + Neodyme)',
        '✓ Bug bounty program live',
        '✓ Mainnet RPC nodes operational',
        '✓ Database replication configured',
        '✓ Monitoring and alerting active',
        '✓ Disaster recovery tested',
        '✓ Rate limiting configured',
        '✓ Geo-restrictions implemented'
    ],
    legal: [
        '✓ Terms of service published',
        '✓ Privacy policy published',
        '✓ Legal entity established',
        '✓ Compliance review completed'
    ],
    marketing: [
        '✓ Website live',
        '✓ Documentation complete',
        '✓ Social media accounts created',
        '✓ Community channels active',
        '✓ Launch announcement prepared'
    ],
    operations: [
        '✓ On-call rotation established',
        '✓ Runbooks documented',
        '✓ Support channels ready',
        '✓ Incident response plan tested'
    ]
};
```

**Launch Day:**
1. Pre-launch verification (T-2 hours)
2. System health check (T-1 hour)
3. Remove beta restrictions (T-0)
4. Announce publicly
5. Monitor closely (first 24 hours)
6. Daily check-ins (first week)

**Post-Launch Monitoring:**
```typescript
const POST_LAUNCH_KPIS = {
    day1: {
        users: 100,
        trades: 500,
        volume: 50000,
        uptime: 0.99
    },
    week1: {
        users: 500,
        trades: 5000,
        volume: 500000,
        uptime: 0.995
    },
    month1: {
        users: 2000,
        trades: 50000,
        volume: 5000000,
        uptime: 0.999
    }
};
```

---

### Environment Setup

#### Development Environment

**Local Development:**
```bash
# Setup script
#!/bin/bash

# 1. Install dependencies
yarn install

# 2. Start local Solana validator
solana-test-validator \
    --reset \
    --ledger /tmp/test-ledger \
    --rpc-port 8899

# 3. Deploy programs
anchor deploy

# 4. Start PostgreSQL
docker-compose up -d postgres

# 5. Run migrations
yarn db:migrate

# 6. Start Redis
docker-compose up -d redis

# 7. Start API server
yarn dev:api

# 8. Start matching engine
yarn dev:matching

# 9. Start frontend
yarn dev:frontend
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: godark_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
  
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin

volumes:
  pg_data:
```

---

#### Staging Environment

**Configuration:**
```yaml
# staging.env
NODE_ENV=staging
API_PORT=3000
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

DATABASE_URL=postgresql://staging:xxx@postgres-staging/godark
REDIS_URL=redis://redis-staging:6379

LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_TRACING=true
```

**Purpose:**
- Final testing before production
- Mirrors production environment
- Safe for breaking changes
- Used for QA and integration tests

---

#### Production Environment

**Multi-Region Architecture:**
```
Primary Region (US-East-1)
├── API Servers (3x)
├── Matching Engine (1x active, 2x standby)
├── Settlement Relayer (1x active, 2x standby)
├── PostgreSQL Primary (1x)
├── PostgreSQL Replicas (2x)
├── Redis Cluster (6 nodes)
└── Solana RPC Nodes (2x)

Backup Region (US-West-2)
├── API Servers (2x)
├── PostgreSQL Replica (1x)
├── Redis Cluster (3 nodes)
└── Solana RPC Node (1x)
```

**Environment Variables:**
```yaml
# production.env
NODE_ENV=production
API_PORT=3000
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://rpc-1.godark.internal

DATABASE_URL=postgresql://prod:xxx@postgres-prod/godark
REDIS_URL=redis://redis-prod:6379

LOG_LEVEL=info
ENABLE_METRICS=true
SENTRY_DSN=https://xxx@sentry.io/xxx

# Security
JWT_SECRET=xxx
API_KEY_SALT=xxx
ENCRYPTION_KEY=xxx

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

---

### Deployment Procedures

#### Smart Contract Deployment

**Deployment Script:**
```bash
#!/bin/bash
# deploy-contracts.sh

set -e

echo "🚀 Deploying GoDark Smart Contracts to Mainnet"

# 1. Verify we're on correct branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Must be on main branch"
    exit 1
fi

# 2. Build programs
echo "📦 Building programs..."
anchor build

# 3. Run tests
echo "🧪 Running tests..."
anchor test

# 4. Get program IDs
PROGRAM_ID=$(solana address -k target/deploy/godark_perps-keypair.json)
echo "Program ID: $PROGRAM_ID"

# 5. Verify sufficient SOL for deployment
BALANCE=$(solana balance)
echo "Deployer balance: $BALANCE"

# 6. Deploy
echo "📤 Deploying to mainnet..."
anchor deploy --provider.cluster mainnet --program-name godark_perps

# 7. Verify deployment
echo "✅ Verifying deployment..."
solana program show $PROGRAM_ID

# 8. Initialize markets
echo "🎯 Initializing markets..."
ts-node scripts/initialize-markets.ts

# 9. Set up governance
echo "🗳️ Setting up multisig..."
ts-node scripts/setup-governance.ts

echo "✅ Deployment complete!"
```

**Rollback Plan:**
```typescript
async function rollbackProgram(oldProgramId: PublicKey): Promise<void> {
    // 1. Pause new operations
    await pauseSystem();
    
    // 2. Close all positions at mark price
    await emergencyCloseAllPositions();
    
    // 3. Return funds to users
    await returnAllFunds();
    
    // 4. Deploy old program version
    await deployProgram(oldProgramId);
    
    // 5. Resume operations
    await resumeSystem();
}
```

---

#### Program Upgrades

**Upgrade Process:**
```typescript
class ProgramUpgrade {
    async proposeUpgrade(newProgramBuffer: PublicKey): Promise<string> {
        // 1. Multisig proposes upgrade
        const proposalId = await this.multisig.proposeTransaction({
            instruction: this.buildUpgradeInstruction(newProgramBuffer),
            description: 'Upgrade to v2.0.0',
            timelock: 48 * 60 * 60 // 48 hours
        });
        
        // 2. Notify community
        await this.notifyCommunity({
            type: 'PROGRAM_UPGRADE',
            proposalId,
            changes: 'See: github.com/godark/contracts/releases/v2.0.0'
        });
        
        return proposalId;
    }
    
    async executeUpgrade(proposalId: string): Promise<void> {
        // Wait for timelock
        await this.waitForTimelock(proposalId);
        
        // Execute with multisig approval
        await this.multisig.executeTransaction(proposalId);
        
        // Verify new program
        await this.verifyUpgrade();
        
        // Announce completion
        await this.announceUpgrade();
    }
}
```

---

#### Database Migrations

**Migration Tool:** node-pg-migrate

```typescript
// migrations/1699999999999_initial_schema.ts
import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Create accounts table
    pgm.createTable('accounts', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        email: { type: 'varchar(255)', notNull: true, unique: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        created_at: { type: 'bigint', notNull: true }
    });
    
    // Create indexes
    pgm.createIndex('accounts', 'email');
    
    // Create orders table
    pgm.createTable('orders', {
        // ...schema
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('orders');
    pgm.dropTable('accounts');
}
```

**Migration Execution:**
```bash
# Run migrations
npm run migrate up

# Rollback last migration
npm run migrate down

# Check migration status
npm run migrate status
```

---

### Monitoring and Alerting

#### System Health Checks

```typescript
class HealthMonitor {
    async performHealthCheck(): Promise<HealthReport> {
        const checks = await Promise.all([
            this.checkAPI(),
            this.checkDatabase(),
            this.checkRedis(),
            this.checkSolanaRPC(),
            this.checkMatchingEngine(),
            this.checkSettlementRelayer()
        ]);
        
        return {
            status: checks.every(c => c.healthy) ? 'HEALTHY' : 'DEGRADED',
            checks,
            timestamp: Date.now()
        };
    }
    
    private async checkAPI(): Promise<HealthCheck> {
        try {
            const start = Date.now();
            await axios.get('http://localhost:3000/health');
            return { service: 'API', healthy: true, latency: Date.now() - start };
        } catch (error) {
            return { service: 'API', healthy: false, error: error.message };
        }
    }
    
    // Similar checks for other services...
}
```

**Health Endpoint:**
```typescript
app.get('/health', async (req, res) => {
    const health = await healthMonitor.performHealthCheck();
    
    res.status(health.status === 'HEALTHY' ? 200 : 503).json(health);
});
```

---

#### Settlement Failure Alerts

```typescript
class SettlementMonitor {
    async monitorSettlements(): Promise<void> {
        const failures = await this.getRecentFailures(300); // Last 5 min
        
        if (failures.length > 3) {
            await this.alert({
                severity: 'CRITICAL',
                title: 'Multiple settlement failures',
                description: `${failures.length} settlements failed in last 5 minutes`,
                actions: [
                    'Check Solana RPC health',
                    'Verify relayer balance',
                    'Review transaction logs'
                ]
            });
        }
    }
}
```

---

#### Liquidation Monitoring

```typescript
class LiquidationMonitor {
    async monitorLiquidations(): Promise<void> {
        const underwaterPositions = await this.getUnderwaterPositions();
        
        if (underwaterPositions.length > 10) {
            await this.alert({
                severity: 'HIGH',
                title: 'High liquidation risk',
                description: `${underwaterPositions.length} positions underwater`,
                metric: {
                    insuranceFundBalance: await this.getInsuranceFundBalance(),
                    totalExposure: this.calculateTotalExposure(underwaterPositions)
                }
            });
        }
    }
}
```

---

#### Performance Metrics

**Key Metrics Dashboard:**
```typescript
const PERFORMANCE_METRICS = {
    // Throughput
    'api.requests_per_second': 'Counter',
    'trades.per_second': 'Counter',
    'orders.per_second': 'Counter',
    
    // Latency
    'api.response_time': 'Histogram',
    'matching.latency': 'Histogram',
    'settlement.latency': 'Histogram',
    
    // Errors
    'api.errors': 'Counter',
    'settlement.failures': 'Counter',
    'liquidation.failures': 'Counter',
    
    // Business
    'users.active': 'Gauge',
    'positions.open': 'Gauge',
    'total.open_interest': 'Gauge',
    'tvl': 'Gauge'
};
```

---

### Incident Response Procedures

#### Incident Severity Levels

```typescript
enum IncidentSeverity {
    P0 = 'CRITICAL',      // System down, funds at risk
    P1 = 'HIGH',          // Major feature broken
    P2 = 'MEDIUM',        // Minor issue, workaround available
    P3 = 'LOW'            // Cosmetic or minor bug
}

const RESPONSE_TIMES = {
    P0: '15 minutes',
    P1: '1 hour',
    P2: '4 hours',
    P3: '24 hours'
};
```

#### Incident Response Workflow

```
1. Detection
   ├── Automated alert
   ├── User report
   └── Monitoring system

2. Triage (Within 15 min for P0)
   ├── Assess severity
   ├── Page on-call engineer
   └── Create incident ticket

3. Investigation
   ├── Check logs
   ├── Review metrics
   ├── Identify root cause
   └── Document findings

4. Resolution
   ├── Apply fix
   ├── Deploy hotfix
   ├── Verify resolution
   └── Monitor closely

5. Post-Mortem
   ├── Write incident report
   ├── Identify improvements
   ├── Update runbooks
   └── Share learnings
```

---

### System Downtime Handling

**Planned Maintenance:**
```typescript
async function scheduleMaintenance(window: MaintenanceWindow): Promise<void> {
    // 1. Announce 48 hours in advance
    await announceMainten

ance({
        startTime: window.start,
        duration: window.duration,
        reason: window.reason
    });
    
    // 2. At maintenance start
    await pauseNewOrders();
    await closeExistingOrders();
    await enableWithdrawalsOnly();
    
    // 3. Perform maintenance
    await executeMaintenance(window.tasks);
    
    // 4. Resume operations
    await verifySystemHealth();
    await resumeFullOperations();
    
    // 5. Announce completion
    await announceCompletion();
}
```

**Unplanned Outage:**
```typescript
async function handleOutage(): Promise<void> {
    // 1. Detect outage
    const outage = await detectOutage();
    
    // 2. Activate incident response
    await activateIncidentResponse(outage);
    
    // 3. Communicate to users
    await broadcastStatus({
        status: 'INVESTIGATING',
        message: 'We are investigating an issue...'
    });
    
    // 4. Implement fix
    await implementFix(outage);
    
    // 5. Post-mortem
    await writePostMortem(outage);
}
```

---

### Backup and Disaster Recovery

**RTO/RPO Targets:**
```typescript
const DISASTER_RECOVERY_TARGETS = {
    RTO: 4 * 60 * 60,        // Recovery Time Objective: 4 hours
    RPO: 15 * 60,             // Recovery Point Objective: 15 minutes
    
    backupFrequency: {
        postgres: '6 hours',
        redis: '1 hour',
        solanaState: 'real-time'
    },
    
    retentionPeriod: {
        hot: 7,               // days
        warm: 30,             // days
        cold: 365 * 7         // 7 years
    }
};
```

**Disaster Recovery Drill:**
```typescript
async function performDRDrill(): Promise<DRReport> {
    console.log('🚨 Starting DR drill...');
    
    // 1. Simulate failure
    const failure = await simulateFailure();
    
    // 2. Activate DR procedures
    const start = Date.now();
    await activateDRProcedures(failure);
    
    // 3. Restore from backup
    await restoreFromBackup();
    
    // 4. Verify integrity
    const verificationResults = await verifyDataIntegrity();
    
    // 5. Measure recovery time
    const recoveryTime = Date.now() - start;
    
    return {
        failureType: failure.type,
        recoveryTime,
        rtoMet: recoveryTime < DISASTER_RECOVERY_TARGETS.RTO * 1000,
        dataLoss: verificationResults.dataLoss,
        rpoMet: verificationResults.dataLoss < DISASTER_RECOVERY_TARGETS.RPO,
        success: verificationResults.success
    };
}
```

---

### Upgrade and Migration Strategy

**Zero-Downtime Deployments:**
```typescript
async function deployZeroDowntime(newVersion: string): Promise<void> {
    // 1. Deploy new version alongside old
    await deployNewVersion(newVersion);
    
    // 2. Run health checks
    await verifyNewVersion();
    
    // 3. Gradually shift traffic (10% -> 50% -> 100%)
    await gradualTrafficShift(newVersion);
    
    // 4. Monitor for issues
    await monitorDeployment(newVersion);
    
    // 5. Rollback if needed
    if (await detectIssues()) {
        await rollback();
    }
    
    // 6. Decommission old version
    await removeOldVersion();
}
```

---


