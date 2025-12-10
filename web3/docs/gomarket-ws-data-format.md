# GoMarket WebSocket Data Format

## L2 Orderbook Endpoint

**Endpoint**: `wss://gomarket-api.goquant.io/ws/l2-orderbook/{exchange}/{symbol}`

**Example**: `wss://gomarket-api.goquant.io/ws/l2-orderbook/binance-usdm/BTCUSDT`

### Message Format

```json
{
  "timestamp": "2025-12-03T04:09:08.823824+00:00",
  "exchange": "Binance-USDM",
  "symbol": "BTCUSDT",
  "bids": [
    ["92756.1", "0.035"],
    ["92752.4", "0.005"],
    ...
  ],
  "asks": [
    ["92760.0", "0.123"],
    ["92761.5", "0.456"],
    ...
  ]
}
```

### Field Descriptions

- `timestamp`: ISO 8601 timestamp string
- `exchange`: Exchange name (e.g., "Binance-USDM")
- `symbol`: Trading pair symbol (e.g., "BTCUSDT")
- `bids`: Array of `[price, size]` tuples (both strings), sorted descending by price
- `asks`: Array of `[price, size]` tuples (both strings), sorted ascending by price

### Notes

- Prices and sizes are strings, need to parse to numbers
- Bids are sorted highest to lowest
- Asks are sorted lowest to highest
- Full orderbook depth (L2) - may contain many levels

---

## Last Trades Endpoint

**Endpoint**: `wss://gomarket-api.goquant.io/ws/last-trades/{exchange}/{symbol}`

**Example**: `wss://gomarket-api.goquant.io/ws/last-trades/binance-usdm/BTCUSDT`

### Message Format

```json
{
  "timestamp": "2025-12-03T04:09:07.120388+00:00",
  "exchange": "Binance-USDM",
  "symbol": "BTCUSDT",
  "trade_id": 6967554320,
  "price": "92749.90",
  "quantity": "0.011",
  "buyer_maker": true
}
```

### Field Descriptions

- `timestamp`: ISO 8601 timestamp string
- `exchange`: Exchange name (e.g., "Binance-USDM")
- `symbol`: Trading pair symbol (e.g., "BTCUSDT")
- `trade_id`: Unique trade identifier (number)
- `price`: Trade price (string)
- `quantity`: Trade quantity (string)
- `buyer_maker`: Boolean indicating if buyer was maker
  - `false` = buyer was taker (buy/sell side = "buy")
  - `true` = buyer was maker (buy/sell side = "sell")

### Notes

- Messages are sent in real-time as trades occur
- Each message represents a single trade
- Price and quantity are strings, need to parse to numbers
- Use `buyer_maker` to determine trade side for display

---

## Symbol Format Mapping

### Internal Format → GoMarket Format

- `BTC-USDT-PERP` → `BTCUSDT` (remove dashes and `-PERP` suffix)
- Exchange identifier: `binance-usdm` (lowercase, hyphenated)

### Conversion Logic

1. Split by `-` to get parts: `["BTC", "USDT", "PERP"]`
2. Take first two parts: `["BTC", "USDT"]`
3. Concatenate: `BTCUSDT`
4. Exchange: Always `binance-usdm` for USD-M futures

