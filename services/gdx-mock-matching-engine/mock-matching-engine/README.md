# Mock Matching Engine

Lightweight Node.js mock matching engine service for GoDark DEX. Simulates order matching with high success rates and integrates with the settlement relayer and position management contracts.

## Overview

The mock matching engine:
- Accepts orders from the trading interface
- Matches orders against simulated liquidity (derived from TradingView prices)
- Generates fills with high success rate (95%+)
- Sends matched trades to the settlement relayer
- Provides real-time order updates via WebSocket

## Architecture

**Flow**: User Order → Mock Matching Engine → Settlement Relayer → Position Management Contract

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Run:**
   ```bash
   npm start
   # Or for development:
   npm run dev
   ```

## Configuration

See `.env.example` for all configuration options:

- `PORT`: Server port (default: 3003)
- `SETTLEMENT_RELAYER_URL`: Settlement relayer service URL (default: http://localhost:8080)
- `SOLANA_RPC_URL`: Solana RPC endpoint (default: http://127.0.0.1:8899)
- `FILL_SUCCESS_RATE`: Order fill success rate (default: 0.95)
- `MARKET_SLIPPAGE_BPS`: Market order slippage in basis points (default: 10)

## API Endpoints

### Health Check
```
GET /api/health
```

### Submit Order
```
POST /api/orders
Content-Type: application/json

{
  "userId": "string",
  "symbol": "string",
  "side": "buy" | "sell",
  "type": "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask",
  "quantity": number,
  "price": number (optional for market orders),
  "leverage": number,
  "tradingViewPrice": number (optional)
}
```

### Get Order Status
```
GET /api/orders/:id
```

### Get User Orders
```
GET /api/orders/user/:userId
```

### Update Price from TradingView
```
POST /api/prices/:symbol
Content-Type: application/json

{
  "price": number
}
```

### Start Engine
```
POST /api/start
```

### Stop Engine
```
POST /api/stop
```

## WebSocket

Connect to `ws://localhost:3003` for real-time order updates.

Messages:
- `{ type: "order_update", data: Order }` - Order status update

## Integration

### With Settlement Relayer

The mock engine automatically sends matched trades to the settlement relayer at `POST /trades`.

### With TradingView

The frontend extracts prices from TradingView DOM and sends them to the mock engine via `POST /api/prices/:symbol`.

## Development

```bash
# Watch mode
npm run watch

# Development mode (with ts-node)
npm run dev
```

## Testing

The engine simulates:
- Market orders: Filled immediately with small slippage
- Limit orders: Filled when price crosses limit
- High success rate: 95%+ fill rate
- Realistic liquidity: Depth varies by symbol (BTC has more depth)


