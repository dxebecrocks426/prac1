## 9. UI/UX Overview (Brief)

**Note:** The UI/UX design is being developed separately by the design team. This section provides a high-level overview of the interface components and their integration with the backend architecture.

---

### Key Interface Components

#### Trading Interface (app.godark.xyz/trade)

**Primary Components:**
- Order entry form with leverage selector
- Symbol selector with search and favorites
- Real-time chart integration (TradingView or custom)
- Position display with PnL tracking
- Order management (working orders, history)
- Funding rate display with countdown timer
- Account balance and margin metrics

**Backend Integration Points:**
```typescript
// API endpoints used by trading interface
const TRADING_INTERFACE_APIs = {
    // Real-time data
    websocket: 'wss://api.godark.xyz/v1/ws',
    channels: [
        'positions:{userId}',
        'orders:{userId}',
        'trades:{symbol}',
        'funding:{symbol}'
    ],
    
    // REST APIs
    submitOrder: 'POST /api/v1/orders',
    cancelOrder: 'DELETE /api/v1/orders/:id',
    getPositions: 'GET /api/v1/positions',
    getOrders: 'GET /api/v1/orders',
    getMarkets: 'GET /api/v1/markets',
    getBalance: 'GET /api/v1/account/balance'
};
```

---

#### Stats Dashboard (stats.godark.xyz)

**Three Metric Sections:**

**1. Execution Quality & Savings**
- Slippage and market impact saved (USDT)
- MEV avoided (USDT)
- Cumulative charts with daily granularity
- Data published at midnight UTC (T-2 days)

**2. GoDark Market Data**
- Matched volume (USDT)
- Liquidity submitted (USDT)
- Buy/Sell ratio (%)
- Average time to fill (seconds)
- Average trade size (USDT)
- Average order size (USDT)
- Matched trade count
- Order count

**3. Operational Transparency**
- Fees collected (USDT)
- Average settlement finality time (seconds)
- Failed settlements count
- System downtime (minutes)
- Average API response time (seconds)

**Backend Integration:**
```typescript
// Stats API endpoints
const STATS_APIs = {
    getExecutionQuality: 'GET /api/v1/stats/execution-quality',
    getMarketData: 'GET /api/v1/stats/market-data',
    getOperationalMetrics: 'GET /api/v1/stats/operational',
    
    // Query parameters
    params: {
        startDate: 'YYYY-MM-DD',
        endDate: 'YYYY-MM-DD',
        symbol: 'optional',
        aggregation: 'daily' // or hourly
    }
};
```

---

#### Admin Panel (app.godark.xyz/admin)

**Sections:**

**1. Linked Wallet**
- Display current linked wallet address
- Link/unlink wallet functionality
- One wallet per account limitation enforced

**2. API Key Management**
- Table of existing API keys
- Columns: Key name, API key, Secret key, Passphrase, IP whitelist
- Edit key name and IP whitelist
- Delete keys (with password confirmation)
- Create new API key (max 5 per account)

**3. Account Management**
- Email address (display only)
- Change password
- Enable/disable 2FA
- Delete account (with confirmation and grace period)

**4. Activity Log**
- Recent logins with device and IP information
- Account actions audit trail
- Security alerts

**Backend Integration:**
```typescript
const ADMIN_APIs = {
    // Wallet management
    linkWallet: 'POST /api/v1/wallet/link',
    unlinkWallet: 'POST /api/v1/wallet/unlink',
    getWalletInfo: 'GET /api/v1/wallet/info',
    
    // API keys
    createAPIKey: 'POST /api/v1/api-keys',
    listAPIKeys: 'GET /api/v1/api-keys',
    updateAPIKey: 'PUT /api/v1/api-keys/:id',
    deleteAPIKey: 'DELETE /api/v1/api-keys/:id',
    
    // Account
    changePassword: 'POST /api/v1/account/change-password',
    enable2FA: 'POST /api/v1/account/2fa/enable',
    disable2FA: 'POST /api/v1/account/2fa/disable',
    deleteAccount: 'POST /api/v1/account/delete',
    
    // Activity
    getActivity: 'GET /api/v1/account/activity'
};
```

---

#### Referrals System (Modal popup)

**Features:**
- User's unique referral code
- Referral link generator
- Referral statistics (sign-ups, trading volume)
- Reward tracking
- Social sharing buttons

**Backend Integration:**
```typescript
const REFERRAL_APIs = {
    getReferralCode: 'GET /api/v1/referrals/code',
    getReferralStats: 'GET /api/v1/referrals/stats',
    getRewards: 'GET /api/v1/referrals/rewards'
};
```

---

### User Flows

#### 1. New User Onboarding

```
Step 1: Registration
├── Enter email and password
├── Agree to terms
├── Submit registration
└── Receive verification email

Step 2: Email Verification
├── Click link in email
├── Account activated
└── Redirect to login

Step 3: Login
├── Enter email and password
├── (Optional) Enter 2FA code
└── Session created

Step 4: Wallet Connection
├── Click "Connect Wallet"
├── Choose wallet provider (Phantom/Trust/Solflare)
├── OR create new wallet (Google/Apple/X/Discord sign-in)
├── Sign authorization message
└── Wallet linked to account

Step 5: Fund Account
├── Authorize USDT amount for trading
├── Sign delegate approval transaction
├── Ephemeral vault created
└── Ready to trade
```

#### 2. Trading Flow

```
Order Submission
├── Select symbol
├── Choose side (Buy/Sell)
├── Set order type (Market/Limit/Peg)
├── Enter size
├── Set leverage
├── (Optional) Set order attributes
├── Review order details
├── Submit
└── Receive confirmation

Order Matching (Backend)
├── Order enters matching engine
├── Price-time priority matching
├── Trade execution
└── WebSocket notification sent

Settlement (Backend)
├── Trade batched with others
├── Net position calculated
├── Settlement transaction sent to Solana
├── On-chain confirmation
└── Position updated

User Notification
├── WebSocket update received
├── Position displayed in UI
├── PnL calculation shown
└── Order moved to history
```

#### 3. Position Management Flow

```
Monitor Position
├── View real-time PnL
├── Check margin ratio
├── Monitor liquidation price
├── Track funding payments
└── Adjust if needed

Close Position
├── Click "Close"
├── Choose close type (Market/Limit)
├── Confirm closure
├── Order submitted
├── Matched and settled
├── Collateral released
└── Available for withdrawal

Withdraw Funds
├── Click "Withdraw"
├── Enter amount (or "Max")
├── Confirm (no signature needed for unlocked funds)
├── Backend initiates withdrawal
├── On-chain transfer
└── USDT received in wallet
```

---

### Basic vs Advanced Mode

#### Basic Interface Mode

**Simplified for Retail Traders:**
- Area line chart (instead of candlesticks)
- No order book or trades feed visible
- Best bid/ask displayed at top of chart
- Only Market and Limit orders
- Quick leverage selector: 1x, 10x, 100x, 1000x
- Quantity slider (instead of manual input)
- GTC only (no complex time-in-force)
- TP/SL (Take Profit / Stop Loss) integration
- No advanced attributes (NBBO, Min Qty removed)

**Backend Differences:**
- Same APIs used
- UI simplifies complexity
- Some order attributes set to defaults automatically

#### Advanced Interface Mode

**Full Feature Set for Professional Traders:**
- Candlestick charts with indicators
- Order book depth visualization
- Recent trades feed
- All order types (Market, Limit, Peg to Mid/Bid/Ask)
- All time-in-force options (IOC, FOK, GTD, GTC)
- All order attributes (AON, Min Qty, NBBO Protection)
- Advanced position management
- Multiple chart layouts
- Hotkey support

---

### Mobile Responsiveness

**Responsive Design Considerations:**
- Mobile-first approach
- Touch-optimized controls
- Simplified navigation on mobile
- Progressive disclosure of features
- Native app consideration (future)

**Mobile-Specific Features:**
- Swipe gestures for tab navigation
- Collapsible sections
- Bottom sheet modals
- Biometric authentication support

---

### Integration Points with Backend APIs

#### WebSocket Message Flow

```typescript
// Client subscribes to channels
client.send(JSON.stringify({
    type: 'subscribe',
    channels: ['positions:user123', 'orders:user123', 'funding:BTC-USDT-PERP']
}));

// Server sends updates
{
    type: 'position_update',
    data: {
        symbol: 'BTC-USDT-PERP',
        size: 1.5,
        unrealizedPnl: 1250.50,
        markPrice: 45123.00,
        liquidationPrice: 40100.00
    }
}

{
    type: 'order_update',
    data: {
        orderId: 'abc123',
        status: 'FILLED',
        filledSize: 0.5,
        avgFillPrice: 45125.00
    }
}

{
    type: 'funding_update',
    data: {
        symbol: 'BTC-USDT-PERP',
        fundingRate: 0.00012,
        nextFundingTime: 1698768000000,
        countdown: 3568
    }
}
```

#### State Management

**Frontend State:**
```typescript
interface AppState {
    // User state
    user: {
        accountId: string;
        email: string;
        walletAddress: string;
        isAuthenticated: boolean;
    };
    
    // Trading state
    trading: {
        selectedSymbol: string;
        orderForm: OrderFormState;
        positions: Position[];
        orders: Order[];
        balance: Balance;
    };
    
    // Market data
    markets: {
        symbols: Symbol[];
        prices: Map<string, Price>;
        fundingRates: Map<string, FundingRate>;
    };
    
    // UI state
    ui: {
        mode: 'BASIC' | 'ADVANCED';
        theme: 'LIGHT' | 'DARK';
        chartLayout: LayoutConfig;
        notifications: Notification[];
    };
}
```

#### Error Handling

**User-Friendly Error Messages:**
```typescript
const ERROR_MESSAGES: Map<string, string> = new Map([
    ['INSUFFICIENT_COLLATERAL', 'Insufficient funds. Please deposit more USDT.'],
    ['POSITION_SIZE_EXCEEDED', 'Order size exceeds maximum allowed for your leverage.'],
    ['MARKET_CLOSED', 'This market is temporarily closed.'],
    ['RATE_LIMIT_EXCEEDED', 'Too many requests. Please wait a moment.'],
    ['INVALID_PRICE', 'Invalid price. Please check your order.'],
    ['LIQUIDATION_PENDING', 'Your position is being liquidated.'],
    ['SETTLEMENT_FAILED', 'Settlement failed. Retrying...'],
    ['NETWORK_ERROR', 'Network error. Please check your connection.']
]);
```

---

### Performance Optimization

**Frontend Optimizations:**
- Virtual scrolling for order tables
- Debounced API calls
- Optimistic UI updates
- Cached market data
- Lazy loading of components
- Code splitting per route
- Service worker for offline support

**Bundle Size Targets:**
- Initial bundle: < 300KB gzipped
- Route chunks: < 100KB each
- Total JS: < 1MB
- First contentful paint: < 1.5s
- Time to interactive: < 3s

---

### Accessibility

**WCAG 2.1 AA Compliance:**
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators
- Alt text for images
- ARIA labels for interactive elements

---

### Browser Support

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Browsers:**
- iOS Safari 14+
- Chrome Mobile 90+

---


