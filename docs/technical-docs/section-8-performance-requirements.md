## 8. Performance Requirements

### Throughput Targets

GoDark is designed to handle institutional-grade trading volumes with minimal latency.

#### Trade Execution Throughput

**Target Metrics:**
```typescript
const THROUGHPUT_TARGETS = {
    tradesPerSecond: {
        target: 100,
        peak: 500,
        sustained: 200
    },
    ordersPerSecond: {
        target: 1000,
        peak: 5000,
        sustained: 2000
    },
    matchingLatency: {
        p50: 5,    // 5ms median
        p95: 15,   // 15ms at 95th percentile
        p99: 50    // 50ms at 99th percentile
    },
    settlementLatency: {
        target: 1000,  // 1 second batch window
        p95: 1500,
        p99: 2000
    }
};
```

#### Concurrent User Support

**Capacity Planning:**

| User Tier | Concurrent Users | Requests/Min per User | Total Load |
|-----------|------------------|----------------------|------------|
| Free | 5,000 | 60 | 300K req/min |
| Basic | 2,000 | 300 | 600K req/min |
| Pro | 500 | 1,200 | 600K req/min |
| Market Maker | 50 | 6,000 | 300K req/min |
| **Total** | **7,550** | **-** | **1.8M req/min** |

```typescript
class CapacityManager {
    private readonly MAX_CONCURRENT_USERS = 10000;
    private readonly MAX_REQUESTS_PER_MINUTE = 2000000; // 2M
    
    async checkCapacity(): Promise<CapacityStatus> {
        const currentUsers = await this.getCurrentUserCount();
        const currentRPM = await this.getCurrentRPM();
        
        return {
            users: {
                current: currentUsers,
                max: this.MAX_CONCURRENT_USERS,
                utilization: currentUsers / this.MAX_CONCURRENT_USERS,
                available: this.MAX_CONCURRENT_USERS - currentUsers
            },
            requests: {
                current: currentRPM,
                max: this.MAX_REQUESTS_PER_MINUTE,
                utilization: currentRPM / this.MAX_REQUESTS_PER_MINUTE,
                available: this.MAX_REQUESTS_PER_MINUTE - currentRPM
            },
            shouldScaleUp: currentUsers > this.MAX_CONCURRENT_USERS * 0.8,
            shouldScaleDown: currentUsers < this.MAX_CONCURRENT_USERS * 0.3
        };
    }
}
```

#### Database Performance

**PostgreSQL Targets:**

```sql
-- Query performance targets
SELECT 
    query_type,
    target_p50_ms,
    target_p95_ms,
    target_p99_ms
FROM performance_targets;

/*
query_type              | target_p50_ms | target_p95_ms | target_p99_ms
------------------------+---------------+---------------+--------------
get_user_positions      | 10            | 25            | 50
get_order_history       | 20            | 50            | 100
insert_trade           | 5             | 10            | 20
update_position        | 8             | 15            | 30
get_market_stats       | 15            | 40            | 80
*/
```

**Redis Performance:**

```typescript
const REDIS_TARGETS = {
    operations: {
        get: { p50: 0.5, p99: 2 },      // milliseconds
        set: { p50: 0.8, p99: 3 },
        zadd: { p50: 1, p99: 5 },
        hget: { p50: 0.6, p99: 2.5 }
    },
    throughput: {
        opsPerSecond: 100000,
        maxMemory: '32GB',
        evictionPolicy: 'allkeys-lru'
    },
    availability: {
        uptime: 0.9999,  // 99.99%
        failoverTime: 30  // seconds
    }
};
```

---

### API Rate Limits per Tier

```typescript
interface RateLimitConfig {
    tier: string;
    restAPI: {
        requestsPerMinute: number;
        requestsPerSecond: number;
        burstAllowance: number;
    };
    websocket: {
        messagesPerSecond: number;
        maxConnections: number;
        maxSubscriptions: number;
    };
    trading: {
        ordersPerMinute: number;
        cancelsPerMinute: number;
        maxOpenOrders: number;
    };
}

const RATE_LIMITS: Map<string, RateLimitConfig> = new Map([
    ['FREE', {
        tier: 'FREE',
        restAPI: {
            requestsPerMinute: 60,
            requestsPerSecond: 2,
            burstAllowance: 10
        },
        websocket: {
            messagesPerSecond: 10,
            maxConnections: 2,
            maxSubscriptions: 10
        },
        trading: {
            ordersPerMinute: 30,
            cancelsPerMinute: 60,
            maxOpenOrders: 20
        }
    }],
    ['BASIC', {
        tier: 'BASIC',
        restAPI: {
            requestsPerMinute: 300,
            requestsPerSecond: 10,
            burstAllowance: 50
        },
        websocket: {
            messagesPerSecond: 50,
            maxConnections: 5,
            maxSubscriptions: 50
        },
        trading: {
            ordersPerMinute: 150,
            cancelsPerMinute: 300,
            maxOpenOrders: 100
        }
    }],
    ['PRO', {
        tier: 'PRO',
        restAPI: {
            requestsPerMinute: 1200,
            requestsPerSecond: 40,
            burstAllowance: 200
        },
        websocket: {
            messagesPerSecond: 200,
            maxConnections: 10,
            maxSubscriptions: 200
        },
        trading: {
            ordersPerMinute: 600,
            cancelsPerMinute: 1200,
            maxOpenOrders: 500
        }
    }],
    ['MARKET_MAKER', {
        tier: 'MARKET_MAKER',
        restAPI: {
            requestsPerMinute: 6000,
            requestsPerSecond: 200,
            burstAllowance: 500
        },
        websocket: {
            messagesPerSecond: 1000,
            maxConnections: 20,
            maxSubscriptions: 1000
        },
        trading: {
            ordersPerMinute: 3000,
            cancelsPerMinute: 6000,
            maxOpenOrders: 5000
        }
    }]
]);
```

---

### Latency Targets

#### End-to-End Latency Budget

```typescript
interface LatencyBudget {
    component: string;
    target_p50: number;
    target_p95: number;
    target_p99: number;
    unit: 'ms';
}

const LATENCY_BUDGETS: LatencyBudget[] = [
    // Order submission flow
    { component: 'API Gateway', target_p50: 2, target_p95: 5, target_p99: 10, unit: 'ms' },
    { component: 'Authentication', target_p50: 1, target_p95: 3, target_p99: 5, unit: 'ms' },
    { component: 'Order Validation', target_p50: 2, target_p95: 5, target_p99: 10, unit: 'ms' },
    { component: 'Matching Engine', target_p50: 5, target_p95: 15, target_p99: 50, unit: 'ms' },
    { component: 'Database Write', target_p50: 5, target_p95: 10, target_p99: 20, unit: 'ms' },
    { component: 'WebSocket Notification', target_p50: 3, target_p95: 8, target_p99: 15, unit: 'ms' },
    
    // Total order to acknowledgment
    { component: 'Order Submission Total', target_p50: 20, target_p95: 50, target_p99: 100, unit: 'ms' },
    
    // Settlement flow
    { component: 'Batch Creation', target_p50: 10, target_p95: 25, target_p99: 50, unit: 'ms' },
    { component: 'Transaction Build', target_p50: 50, target_p95: 100, target_p99: 200, unit: 'ms' },
    { component: 'Solana Confirmation', target_p50: 400, target_p95: 800, target_p99: 1500, unit: 'ms' },
    { component: 'Position Update', target_p50: 20, target_p95: 50, target_p99: 100, unit: 'ms' },
    
    // Total trade to settlement
    { component: 'Settlement Total', target_p50: 1000, target_p95: 1500, target_p99: 2000, unit: 'ms' },
    
    // API endpoints
    { component: 'GET /markets', target_p50: 10, target_p95: 25, target_p99: 50, unit: 'ms' },
    { component: 'GET /positions', target_p50: 15, target_p95: 40, target_p99: 80, unit: 'ms' },
    { component: 'GET /orders', target_p50: 20, target_p95: 50, target_p99: 100, unit: 'ms' },
    { component: 'POST /orders', target_p50: 25, target_p95: 60, target_p99: 120, unit: 'ms' },
    { component: 'DELETE /orders/:id', target_p50: 15, target_p95: 35, target_p99: 70, unit: 'ms' },
    
    // WebSocket
    { component: 'WS Message Delivery', target_p50: 5, target_p95: 15, target_p99: 50, unit: 'ms' },
    { component: 'WS Ping/Pong', target_p50: 3, target_p95: 8, target_p99: 15, unit: 'ms' }
];
```

#### Geographic Latency Targets

```typescript
const GEOGRAPHIC_LATENCY = {
    regions: [
        {
            region: 'North America (US East)',
            distance: '0 km',
            targetLatency: { p50: 20, p95: 50, p99: 100 }
        },
        {
            region: 'North America (US West)',
            distance: '4,000 km',
            targetLatency: { p50: 60, p95: 100, p99: 150 }
        },
        {
            region: 'Europe (London)',
            distance: '5,500 km',
            targetLatency: { p50: 80, p95: 120, p99: 180 }
        },
        {
            region: 'Asia (Singapore)',
            distance: '15,000 km',
            targetLatency: { p50: 150, p95: 200, p99: 300 }
        },
        {
            region: 'Asia (Tokyo)',
            distance: '11,000 km',
            targetLatency: { p50: 120, p95: 170, p99: 250 }
        }
    ],
    mitigations: [
        'CloudFlare CDN for static assets',
        'Regional API endpoints (future)',
        'WebSocket connection pooling',
        'Optimized protocol (protobuf for WS)'
    ]
};
```

---

### Funding Rate Calculation (1-Second Intervals)

```typescript
class FundingRatePerformance {
    private readonly CALCULATION_INTERVAL_MS = 1000;
    private readonly TARGET_CALCULATION_TIME_MS = 100;
    
    async calculateFundingRates(): Promise<PerformanceMetrics> {
        const startTime = performance.now();
        const symbols = await this.getAllActiveSymbols();
        
        // Parallel calculation for all symbols
        const calculations = await Promise.all(
            symbols.map(symbol => this.calculateForSymbol(symbol))
        );
        
        const duration = performance.now() - startTime;
        
        // Performance check
        if (duration > this.TARGET_CALCULATION_TIME_MS) {
            await this.alertPerformanceDegradation({
                type: 'FUNDING_RATE_SLOW',
                duration,
                target: this.TARGET_CALCULATION_TIME_MS,
                symbolCount: symbols.length
            });
        }
        
        return {
            symbolCount: symbols.length,
            duration,
            averagePerSymbol: duration / symbols.length,
            updatesPerSecond: 1000 / duration,
            targetMet: duration <= this.TARGET_CALCULATION_TIME_MS
        };
    }
    
    private async calculateForSymbol(symbol: string): Promise<FundingRate> {
        // Optimized parallel data fetching
        const [markPrice, indexPrice, prevRate] = await Promise.all([
            this.getMarkPrice(symbol),
            this.getIndexPrice(symbol),
            this.getPreviousFundingRate(symbol)
        ]);
        
        // Fast calculation (< 1ms per symbol)
        const premiumIndex = (markPrice - indexPrice) / indexPrice;
        const interestRate = 0.01 / (24 * 3600); // Daily rate per second
        const fundingRate = premiumIndex + interestRate;
        
        // Clamp to limits
        const clampedRate = Math.max(-0.0005, Math.min(0.0005, fundingRate));
        
        // Store in Redis (async, don't wait)
        this.storeFundingRate(symbol, clampedRate).catch(err => 
            console.error('Failed to store funding rate:', err)
        );
        
        return {
            symbol,
            rate: clampedRate,
            premiumIndex,
            markPrice,
            indexPrice,
            timestamp: Date.now()
        };
    }
}
```

**Performance Optimization:**

```typescript
// Batch processing for efficiency
class BatchFundingRateCalculator {
    private readonly BATCH_SIZE = 50;
    
    async calculateAllMarkets(symbols: string[]): Promise<void> {
        // Process in batches to avoid overwhelming the system
        for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
            const batch = symbols.slice(i, i + this.BATCH_SIZE);
            
            await Promise.all(
                batch.map(symbol => this.calculateFundingRate(symbol))
            );
            
            // Small delay between batches if needed
            if (i + this.BATCH_SIZE < symbols.length) {
                await this.sleep(10); // 10ms between batches
            }
        }
    }
}
```

---

### Real-Time Liquidation Monitoring

```typescript
class LiquidationMonitorPerformance {
    private readonly CHECK_INTERVAL_MS = 1000;  // Every second
    private readonly TARGET_CHECK_TIME_MS = 500; // Must complete in 500ms
    
    async monitorAllPositions(): Promise<MonitoringMetrics> {
        const startTime = performance.now();
        
        // 1. Get all open positions (cached)
        const positions = await this.getCachedOpenPositions();
        
        // 2. Get current prices for all symbols (batch fetch)
        const uniqueSymbols = [...new Set(positions.map(p => p.symbol))];
        const priceMap = await this.batchGetPrices(uniqueSymbols);
        
        // 3. Check each position in parallel
        const checks = await Promise.allSettled(
            positions.map(position => 
                this.checkPosition(position, priceMap.get(position.symbol))
            )
        );
        
        const duration = performance.now() - startTime;
        
        // 4. Collect positions needing liquidation
        const liquidations = checks
            .filter(r => r.status === 'fulfilled' && r.value?.needsLiquidation)
            .map(r => (r as PromiseFulfilledResult<any>).value);
        
        // 5. Execute liquidations (async, don't wait)
        if (liquidations.length > 0) {
            this.executeLiquidations(liquidations).catch(err =>
                console.error('Liquidation execution failed:', err)
            );
        }
        
        // 6. Performance tracking
        if (duration > this.TARGET_CHECK_TIME_MS) {
            await this.alertSlowMonitoring({
                duration,
                positionCount: positions.length,
                symbolCount: uniqueSymbols.length,
                liquidationCount: liquidations.length
            });
        }
        
        return {
            positionCount: positions.length,
            symbolCount: uniqueSymbols.length,
            duration,
            averagePerPosition: duration / positions.length,
            liquidationsTriggered: liquidations.length,
            targetMet: duration <= this.TARGET_CHECK_TIME_MS
        };
    }
    
    private async batchGetPrices(symbols: string[]): Promise<Map<string, number>> {
        // Batch fetch from Redis (single round trip)
        const pipeline = this.redis.pipeline();
        symbols.forEach(symbol => {
            pipeline.get(`price:${symbol}:mark`);
        });
        
        const results = await pipeline.exec();
        
        const priceMap = new Map<string, number>();
        symbols.forEach((symbol, index) => {
            priceMap.set(symbol, parseFloat(results[index][1]));
        });
        
        return priceMap;
    }
}
```

---

### Scalability Considerations

#### Horizontal Scaling Strategy

```typescript
const SCALING_ARCHITECTURE = {
    components: {
        apiGateway: {
            type: 'Stateless',
            scaling: 'Horizontal',
            instances: {
                min: 3,
                max: 20,
                targetCPU: 70
            }
        },
        matchingEngine: {
            type: 'Stateful (per symbol)',
            scaling: 'Horizontal + Sharding',
            sharding: {
                strategy: 'By symbol',
                shardsPerInstance: 10,
                rebalancing: 'Dynamic'
            }
        },
        settlementRelayer: {
            type: 'Stateful (leader election)',
            scaling: 'Active-Passive',
            instances: {
                active: 1,
                passive: 2,
                failoverTime: '< 30s'
            }
        },
        liquidationEngine: {
            type: 'Stateless',
            scaling: 'Horizontal',
            instances: {
                min: 2,
                max: 10,
                targetPositions: 5000
            }
        },
        websocketServer: {
            type: 'Stateful (connections)',
            scaling: 'Horizontal',
            instances: {
                min: 3,
                max: 20,
                connectionsPerInstance: 5000
            }
        }
    },
    databases: {
        postgresql: {
            type: 'Primary-Replica',
            instances: {
                primary: 1,
                replicas: 3,
                readLoadBalancing: true
            },
            scaling: {
                vertical: 'Up to 64 vCPU, 256GB RAM',
                horizontal: 'Sharding by user_id (future)'
            }
        },
        redis: {
            type: 'Cluster',
            instances: {
                masters: 6,
                replicasPerMaster: 2
            },
            scaling: {
                addShards: 'Linear performance increase',
                maxShards: 16
            }
        }
    }
};
```

#### Load Balancing

```typescript
class LoadBalancer {
    private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
    
    async routeRequest(request: Request): Promise<Response> {
        // 1. Get healthy instances
        const instances = await this.getHealthyInstances(request.service);
        
        if (instances.length === 0) {
            throw new Error('No healthy instances available');
        }
        
        // 2. Choose instance based on strategy
        const instance = this.selectInstance(instances, request);
        
        // 3. Route request
        try {
            return await this.forwardRequest(instance, request);
        } catch (error) {
            // 4. Retry on different instance
            return await this.retryOnDifferentInstance(instances, request);
        }
    }
    
    private selectInstance(instances: Instance[], request: Request): Instance {
        switch (request.service) {
            case 'matching-engine':
                // Hash-based routing for symbol affinity
                return this.consistentHash(request.symbol, instances);
                
            case 'api-gateway':
                // Least connections
                return this.leastConnections(instances);
                
            case 'websocket':
                // Least connections + geographic proximity
                return this.geoAwareLeastConnections(instances, request.ip);
                
            default:
                // Round robin
                return this.roundRobin(instances);
        }
    }
}
```

---

### Performance Monitoring and Metrics

#### Key Performance Indicators (KPIs)

```typescript
interface PerformanceKPIs {
    // Throughput
    tradesPerSecond: Metric;
    ordersPerSecond: Metric;
    settlementsPerSecond: Metric;
    
    // Latency
    orderSubmissionLatency: LatencyMetric;
    matchingLatency: LatencyMetric;
    settlementLatency: LatencyMetric;
    apiResponseTime: LatencyMetric;
    websocketLatency: LatencyMetric;
    
    // Availability
    uptime: Metric;
    apiAvailability: Metric;
    websocketAvailability: Metric;
    settlementSuccessRate: Metric;
    
    // Resource utilization
    cpuUtilization: Metric;
    memoryUtilization: Metric;
    diskIOPS: Metric;
    networkBandwidth: Metric;
    
    // Business metrics
    activeUsers: Metric;
    concurrentConnections: Metric;
    totalOpenPositions: Metric;
    totalOpenInterest: Metric;
}

class PerformanceMonitor {
    async collectMetrics(): Promise<PerformanceKPIs> {
        return {
            // Throughput (last minute)
            tradesPerSecond: await this.calculateRate('trades', 60),
            ordersPerSecond: await this.calculateRate('orders', 60),
            settlementsPerSecond: await this.calculateRate('settlements', 60),
            
            // Latency (p50, p95, p99)
            orderSubmissionLatency: await this.calculateLatency('order_submission'),
            matchingLatency: await this.calculateLatency('matching'),
            settlementLatency: await this.calculateLatency('settlement'),
            apiResponseTime: await this.calculateLatency('api'),
            websocketLatency: await this.calculateLatency('websocket'),
            
            // Availability (last hour)
            uptime: await this.calculateUptime(3600),
            apiAvailability: await this.calculateAvailability('api', 3600),
            websocketAvailability: await this.calculateAvailability('websocket', 3600),
            settlementSuccessRate: await this.calculateSuccessRate('settlement', 3600),
            
            // Resources (current)
            cpuUtilization: await this.getCPUUtilization(),
            memoryUtilization: await this.getMemoryUtilization(),
            diskIOPS: await this.getDiskIOPS(),
            networkBandwidth: await this.getNetworkBandwidth(),
            
            // Business (current)
            activeUsers: await this.getActiveUsers(),
            concurrentConnections: await this.getConcurrentConnections(),
            totalOpenPositions: await this.getTotalOpenPositions(),
            totalOpenInterest: await this.getTotalOpenInterest()
        };
    }
    
    async checkSLAs(): Promise<SLAStatus[]> {
        const slas: SLA[] = [
            { metric: 'uptime', target: 0.999, current: await this.getUptime() },
            { metric: 'api_latency_p95', target: 100, current: await this.getAPILatencyP95() },
            { metric: 'settlement_success', target: 0.99, current: await this.getSettlementSuccessRate() },
            { metric: 'trades_per_second', target: 100, current: await this.getTradesPerSecond() }
        ];
        
        return slas.map(sla => ({
            ...sla,
            met: this.isSLAMet(sla),
            breachDuration: this.getBreachDuration(sla)
        }));
    }
}
```

#### Alerting Thresholds

```typescript
const ALERT_THRESHOLDS = {
    critical: {
        apiLatencyP95: 500,           // ms
        settlementLatency: 5000,      // ms
        errorRate: 0.05,              // 5%
        uptime: 0.99,                 // 99%
        cpuUtilization: 90,           // %
        memoryUtilization: 90,        // %
        diskUtilization: 85,          // %
    },
    warning: {
        apiLatencyP95: 200,
        settlementLatency: 2000,
        errorRate: 0.02,
        uptime: 0.995,
        cpuUtilization: 75,
        memoryUtilization: 75,
        diskUtilization: 70,
    },
    actions: {
        critical: [
            'Page on-call engineer',
            'Create incident ticket',
            'Trigger auto-scaling',
            'Send user notification'
        ],
        warning: [
            'Send Slack alert',
            'Log to monitoring',
            'Prepare for scaling'
        ]
    }
};
```

---


