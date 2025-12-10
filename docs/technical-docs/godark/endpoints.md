# GoDark Testnet API Endpoints

This guide provides comprehensive information about all available endpoints for interacting with the GoDark dark pool trading system.

## Table of Contents

- [Authentication](#authentication)
- [Account Management](#account-management)
- [API Key Management](#api-key-management)
- [Order Management](#order-management)
  - [Place Order](#place-order)
  - [Pegged Orders](#pegged-order-examples)
  - [Cancel Order](#cancel-order)
  - [Modify Order](#modify-order)
- [Market Data](#market-data)
- [WebSocket Subscriptions](#websocket-subscriptions)
  - [Order Updates WebSocket](#order-updates-websocket)
   - [Account Balances WebSocket](#account-balance-websocket)
  - [Account Transactions WebSocket](#account-transactions-websocket)
  - [Orderbook WebSocket](#orderbook-websocket)
 
  - [Analytics WebSocket](#analytics-websocket)
- [Error Handling](#error-handling)

## Base URL's

HTTP : `https://godark.goquant.io/testnet`

Private WS : `wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>`

Public WS : `wss://godark-testnet.goquant.io/ws/public?handshake_token=<HANDSHAKE-TOKEN>`

**Note:** All WebSocket connections require authentication using the `handshake_token` parameter in the URL.

## Authentication

All API requests require authentication using a `Handshake-Token` header.

```http
Handshake-Token: <YOUR-HANDSHAKE-TOKEN>
```

## Account Management

### Create Account

Creates a new trading account in the GoDark system.

**Endpoint:** `POST /create-account`

**Headers:**
```http
Content-Type: application/json
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Request Body:**
```json
{
  "email": "trader@example.com",
  "password": "secure-password",
  "account_name": "My Trading Account"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "email": "trader@example.com",
    "account_id": "12345"
  }
}
```

**Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/create-account \
  -H "Content-Type: application/json" \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>" \
  -d '{
    "email": "trader@example.com",
    "password": "secure-password",
    "account_name": "My Trading Account"
  }'
```

### Get Account ID

Retrieves the account ID for an existing account using login credentials.

**Endpoint:** `POST /get-account-id`

**Headers:**
```http
Content-Type: application/json
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Request Body:**
```json
{
  "email": "trader@example.com",
  "password": "secure-password",
  "account_name": "My Trading Account"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "account_id": "12345",
    "account_name": "My Trading Account"
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `account_id` | string | Unique account identifier needed for API key creation |
| `account_name` | string | Human-readable account name |

**Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/get-account-id \
  -H "Content-Type: application/json" \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>" \
  -d '{
    "email": "trader@example.com",
    "password": "secure-password",
    "account_name": "My Trading Account"
  }'
```

**Error Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1001,
  "data": {
    "message": "Invalid email, password, or account name"
  }
}
```
## API Key Management

### Create API Key

Generates a new API key for programmatic access to the GoDark system.

**Endpoint:** `POST /create-api-key`

**Headers:**
```http
Content-Type: application/json
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Request Body:**
```json
{
  "account_id": "1248734343",
  "passphrase": "my-secure-passphrase"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "client_id": "abc123def456",
    "client_secret": "xyz789uvw012",
    "passphrase": "my-secure-passphrase",
    "account_id": "12345",
    "is_testnet": true
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `client_id` | string | API key identifier for authentication |
| `client_secret` | string | Secret key for authentication |
| `passphrase` | string | Passphrase for additional security |
| `account_id` | string | Account identifier |
| `is_testnet` | boolean | Indicates if this is a testnet API key  |

**Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/create-api-key \
  -H "Content-Type: application/json" \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>" \
  -d '{
    "account_id": "878678234234",
    "passphrase": "my-secure-passphrase"
  }'
```

### Validate API Credentials

Validates existing API credentials and returns account information.

**Endpoint:** `POST /validate-creds`

**Headers:**
```http
Content-Type: application/json
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Request Body:**
```json
{
  "client_id": "abc123def456",
  "client_secret": "xyz789uvw012",
  "passphrase": "my-secure-passphrase"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "valid": true,
    "account_id": "12345",
    "is_testnet": true
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | Whether the provided credentials are valid |
| `account_id` | string | Account identifier (only included if credentials are valid) |
| `is_testnet` | boolean | Indicates if this is a testnet validation |

**Example (Valid Credentials):**
```bash
curl -X POST https://godark.goquant.io/testnet/validate-creds \
  -H "Content-Type: application/json" \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>" \
  -d '{
    "client_id": "abc123def456",
    "client_secret": "xyz789uvw012",
    "passphrase": "my-secure-passphrase"
  }'
```

**Example Response (Invalid Credentials):**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "valid": false,
    "is_testnet": true
  }
}
```

## Order Management

The GoDark system supports multiple dark pool venues. Orders are routed to specific venues using the URL pattern: `/place`, `/cancel`, `/modify`.

### Place Order

Places a new order in the specified dark pool venue.

**Endpoint:** `POST /place`

**Headers:**
```http
Content-Type: application/json
X-API-KEY : "YOUR-API-KEY"
X-API-SECRET : "YOUR-SECRET"
X-API-PASSPHRASE : "YOUR-PASSPHRASE"
Handshake-Token : "HANDSHAKE-TOKEN"
```

**Request Body:**
```json
{
  "symbol": "BTC-USDT",
  "side": "BUY",
  "price": 65000.0,
  "quantity": 2.5,
  "time_in_force": "GTC",
  "execution_type": "STANDARD",
  "type": "LIMIT",
  "aon": false,
  "min_fill_size": 0.5,
  "nbbo_protection": {
    "enabled": true,
    "fallback_behavior": "allow"
  },
  "visibility" : "DARK"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `symbol` | string | Yes | Trading pair (e.g., "BTC-USDT") |
| `side` | string | Yes | "BUY" or "SELL" |
| `price` | number | Conditional | Order price (required for LIMIT orders, optional for pegged and market orders as limit price) |
| `quantity` | number | Yes | Order quantity (must be > 0) |
| `time_in_force` | string | Yes | "GTC", "IOC", "FOK", "GTD" |
| `execution_type` | string | Yes | "STANDARD", "FOK", "MIN_QTY" |
| `type` | string | Yes | "LIMIT", "MARKET", "PEG_TO_MID", "PEG_TO_BID", or "PEG_TO_ASK" |
| `aon` | boolean | No | All or None execution flag - order must be completely filled or remain unfilled (default: false) |
| `min_fill_size` | number | No | Minimum fill size requirement (must be ≥ 0 if provided) |
| `nbbo_protection` | object | No | NBBO protection settings |
| `expiry_time` | number | No | Expiry timestamp (required for GTD orders) |
| `visibility` | string | Yes | "DARK" or "LIT" |

**Important Validation Rules:**
- **Required fields cannot be missing or null** - Will return HTTP 400 with detailed error message
- **Optional fields cannot be explicitly null** - If provided, they must have valid values
- **Field types must match** - Strings for text fields, numbers for numeric fields
- **Value ranges must be respected** - Prices and quantities must be positive
- **Price field requirements** - Required for LIMIT orders, optional for pegged and market orders

**Trade Rules and Limits:**

All orders are subject to the following trade rules:

**1. Rate Limiting**
- **Limit:** 1 action per 100 microseconds (0.0001 seconds) per symbol
- **Applies to:** Place, cancel, and modify operations
- **Error:** Returns HTTP 429 with code `1400` if exceeded

**2. Minimum Order Size** 
- **Limit:** $1,000 USDT minimum notional value
- **Calculation:** `price × quantity` must be ≥ $1,000 USDT
- **Error:** Returns HTTP 400 with code `1402` if violated

**3. Quote Rest Period**
- **Limit:** 100 microseconds minimum between quote updates
- **Applies to:** Modify operations that change price
- **Error:** Returns HTTP 400 with code `1402` if violated

**Time in Force Options:**
- `GTC` (Good Till Cancelled): Order remains active until cancelled
- `IOC` (Immediate or Cancel): Order executes immediately or is cancelled
- `FOK` (Fill or Kill): Order must be completely filled or cancelled
- `GTD` (Good Till Date): Order expires at specified time

**All or None (AON) Execution:**
- `aon: true`: Order must be completely executed in a single transaction or remain unfilled; no partial executions allowed
- `aon: false`: Order can be partially filled (default behavior)

**Order Type Options:**
- `LIMIT`: Order executes only at specified price or better
- `MARKET`: Order executes immediately at best available market prices
- `PEG_TO_MID`: Order price automatically pegs to the midpoint between best bid and ask
- `PEG_TO_BID`: Order price automatically pegs to the current best bid price
- `PEG_TO_ASK`: Order price automatically pegs to the current best ask price


**Execution Type Options:**
- `STANDARD`: Standard execution allowing partial fills
- `FOK`: Fill or Kill execution
- `MIN_QTY`: No partial fills allowed

**NBBO Protection:**
```json
{
  "enabled": true,
  "fallback_behavior": "allow"
}
```

Fallback behaviors:
- `allow`: Bypasses NBBO constraints entirely, allowing all price levels
- `block`: Rejects orders that would execute at prices worse than current NBBO
- `warn`: Allows orders to proceed but logs warnings for prices outside NBBO

**Order Visibility:**

- `DARK` : Orders remain completely hidden from orderbook published on the darkpool blockchain
- `LIT` : Orders displayed in orderbook published on the darkpool blockchain visible to all network participants

**Order Compatibility Matrix:**

The following table shows which order attributes are supported for each combination of Order Type and Time in Force (TIF):

| Order Type | TIF | All or None (AON) | MinQty | NBBO Protection | Dark/Lit Visibility |
|------------|-----|-------------------|---------|-----------------|-------------------|
| Market | IOC | ❌ | ✅ | ✅ | ✅ |
| Market | FOK | ❌ | ✅ | ✅ | ✅ |
| Market | GTC | ❌ | ❌ | ❌ | ❌ |
| Market | GTD | ❌ | ❌ | ❌ | ❌ |
| Limit | IOC | ✅ | ✅ | ✅ | ✅ |
| Limit | FOK | ✅ | ✅ | ✅ | ✅ |
| Limit | GTC | ✅ | ✅ | ✅ | ✅ |
| Limit | GTD | ✅ | ✅ | ✅ | ✅ |
| Peg to Mid | IOC | ✅ | ❌ | ✅ | ✅ |
| Peg to Mid | FOK | ❌ | ❌ | ❌ | ❌ |
| Peg to Mid | GTC | ✅ | ❌ | ✅ | ✅ |
| Peg to Mid | GTD | ✅ | ❌ | ✅ | ✅ |
| Peg to Bid/Ask | IOC | ✅ | ❌ | ✅ | ✅ |
| Peg to Bid/Ask | FOK | ❌ | ❌ | ❌ | ❌ |
| Peg to Bid/Ask | GTC | ✅ | ❌ | ✅ | ✅ |
| Peg to Bid/Ask | GTD | ✅ | ❌ | ✅ | ✅ |

**Legend:**
- ✅ = Supported
- ❌ = Not Supported

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "order_id": 123456789,
    "nbbo_info": "NBBO protection active"
  }
}
```

**Error Response Examples:**

**Validation Error (Missing Required Fields):**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1401,
  "data": {
    "message": "Validation failed: Required field 'quantity' is missing; Required field 'time_in_force' is missing; Required field 'execution_type' is missing; Required field 'visibility' is missing"
  }
}
```

**Validation Error (Null Field Values):**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z", 
  "code": 1401,
  "data": {
    "message": "Validation failed: Required field 'time_in_force' cannot be null"
  }
}
```

**Rate Limiting Error:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1429,
  "data": {
    "message": "Rate limited: 1 action per 100μs per symbol"
  }
}
```

**Minimum Order Size Violation:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1430,
  "data": {
    "message": "Minimum order size violation: $1,000 USDT required"
  }
}
```

**Quote Rest Violation:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1430,
  "data": {
    "message": "Quote rest violation: 100μs minimum between quote updates"
  }
}
```

**NBBO Validation Error:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1431,
  "data": {
    "message": "NBBO validation failed: price violates best bid/ask"
  }
}
```

**Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "price": 65000.0,
    "quantity": 2.5,
    "time_in_force": "GTC",
    "execution_type": "STANDARD",
    "aon": False,
    "min_fill_size": 0.5,
    "nbbo_protection": 
    {
      "enabled": true,
      "fallback_behavior": "allow"
    },
    "visibility": "DARK"
  }'
```

### Pegged Order Examples

GoDark supports intelligent pegged orders that automatically adjust their price based on market conditions. These order types provide dynamic pricing without manual intervention.

**Peg to Midpoint Order:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "quantity": 1.5,
    "type": "PEG_TO_MID",
    "time_in_force": "GTC",
    "execution_type": "STANDARD",
    "visibility": "DARK",
    "nbbo_protection": {
      "enabled": true,
      "fallback_behavior": "allow"
    }
  }'
```

**Peg to Bid Order:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "quantity": 2.0,
    "type": "PEG_TO_BID",
    "time_in_force": "GTC",
    "execution_type": "STANDARD",
    "visibility": "LIT"
  }'
```

**Peg to Ask Order:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "SELL",
    "quantity": 1.0,
    "type": "PEG_TO_ASK",
    "time_in_force": "GTD",
    "execution_type": "STANDARD",
    "visibility": "DARK",
    "expiry_time": 1640995200000000000
  }'
```

**Market Order Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "quantity" : 10,
    "type": "MARKET",
    "time_in_force": "IOC",
    "execution_type": "STANDARD",
    "aon": False,
    "visibility": "DARK",
    "min_fill_size": 0.5,
    "nbbo_protection": 
    {
        "enabled": false,
        "fallback_behavior": "allow"
    }
  }'
```

**AON (All or None) Order Example:**
```bash
curl -X POST https://godark.goquant.io/testnet/place \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: API-KEY" \ 
  -H "X-API-SECRET: SECRET" \
  -H "X-API-PASSPHRASE: PASSPHRASE" \
  -H "Handshake-Token: HANDSHAKE-TOKEN" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "price": 65000.0,
    "quantity": 2.0,
    "type": "LIMIT",
    "time_in_force": "GTC",
    "execution_type": "STANDARD",
    "aon": True,
    "visibility": "DARK",
    "nbbo_protection": 
    {
        "enabled": true,
        "fallback_behavior": "allow"
    }
  }'
```

### Cancel Order

Cancels an existing order.

**Endpoint:** `POST /cancel`

**Headers:**
```http
Content-Type: application/json
X-API-KEY : "YOUR_API_KEY"
X-API-SECRET : "YOUR_SECRET"
X-API-PASSPHRASE : "YOUR_PASSPHRASE"
Handshake-Token : "HANDSHAKE-TOKEN"
```

**Request Body:**
```json
{
  "order_id": 123456789
}
```

**Trade Rules:**
- Subject to **rate limiting**: 1 action per 100 microseconds per symbol
- Cancel operations count toward the action rate limit

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "order_id": 123456789
  }
}
```

**Error Examples:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1429,
  "data": {
    "message": "Rate limited: 1 action per 100μs per symbol"
  }
}
```

### Modify Order

Modifies an existing order.

**Endpoint:** `POST /modify`

**Headers:**
```http
Content-Type: application/json
X-API-KEY : "YOUR_API_KEY"
X-API-SECRET : "YOUR_SECRET"
X-API-PASSPHRASE : "YOUR_PASSPHRASE"
Handshake-Token : "HANDSHAKE-TOKEN"
```

**Request Body:**
```json
{
  "order_id": 123456789,
  "price": 65500.0,
  "quantity": 3.0,
  "min_fill_size" : 3.0
}
```

**Trade Rules:**
- Subject to **rate limiting**: 1 action per 100 microseconds per symbol  
- Subject to **quote rest period**: 100 microseconds minimum between price changes
- Subject to **minimum order size**: Modified order must meet $1,000 USDT minimum if quantity changed
- At least one field (price or quantity) must be provided for modification

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "order_id": 123456789
  }
}
```

**Error Examples:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1430,
  "data": {
    "message": "Quote rest violation: 100μs minimum between quote updates"
  }
}
```

## Market Data

### Get NBBO Status

Retrieves the current status and statistics of the NBBO (National Best Bid and Offer) stream.

**Endpoint:** `GET /nbbo/status`

**Headers:**
```http
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "nbbo_stream": {
      "state": "STREAMING",
      "connected": true,
      "total_messages": 150420,
      "total_updates": 89754,
      "unique_symbols": 156,
      "reconnection_count": 2,
      "updates_per_second": 42.5,
      "is_healthy": true
    },
    "instruments_with_nbbo": 156
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `nbbo_stream.state` | string | Current stream state: "STREAMING", "CONNECTING", "DISCONNECTED", or "ERROR" |
| `nbbo_stream.connected` | boolean | Whether the stream is currently connected |
| `nbbo_stream.total_messages` | number | Total number of messages received from the stream |
| `nbbo_stream.total_updates` | number | Total number of NBBO updates processed |
| `nbbo_stream.unique_symbols` | number | Number of unique symbols that have received updates |
| `nbbo_stream.reconnection_count` | number | Number of times the stream has reconnected |
| `nbbo_stream.updates_per_second` | number | Current updates per second rate |
| `nbbo_stream.is_healthy` | boolean | Overall health status of the NBBO stream |
| `instruments_with_nbbo` | number | Current number of instruments with NBBO data |

**Example:**
```bash
curl -X GET https://godark.goquant.io/testnet/nbbo/status \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>"
```

**Error Responses:**
- `1000`: Invalid or missing handshake token
- `1501`: NBBO stream coordinator service unavailable
- `1500`: Internal server error

### Get Trading Instruments

Retrieves the list of all available trading instruments supported by the GoDark system.

**Endpoint:** `GET /get-instruments`

**Headers:**
```http
Handshake-Token: <HANDSHAKE-TOKEN>
```

**Response:**
```json
{
    "timestamp": "2025-07-17T20:33:50.841Z",
    "code": 0,
    "data": [
        {
            "symbol": "BTC-USDT",
            "id": 1,
            "status": "TRADING"
        },
        {
            "symbol": "ETH-USDT",
            "id": 2,
            "status": "TRADING"
        },
        {
            "symbol": "XRP-USDT",
            "id": 3,
            "status": "TRADING"
        },
        {
            "symbol": "LINK-USDT",
            "id": 4,
            "status": "TRADING"
        },
        {
            "symbol": "ADA-USDT",
            "id": 5,
            "status": "TRADING"
        },
        {
            "symbol": "DOGE-USDT",
            "id": 6,
            "status": "TRADING"
        },
        {
            "symbol": "SOL-USDT",
            "id": 7,
            "status": "TRADING"
        },
        {
            "symbol": "AVAX-USDT",
            "id": 8,
            "status": "TRADING"
        },
        {
            "symbol": "USDC-USDT",
            "id": 9,
            "status": "TRADING"
        },
        {
            "symbol": "BTC-USDC",
            "id": 10,
            "status": "TRADING"
        },
        {
            "symbol": "ETH-USDC",
            "id": 11,
            "status": "TRADING"
        },
        {
            "symbol": "SOL-USDC",
            "id": 12,
            "status": "TRADING"
        },
        {
            "symbol": "XRP-USDC",
            "id": 13,
            "status": "TRADING"
        },
        {
            "symbol": "DOGE-USDC",
            "id": 14,
            "status": "TRADING"
        },
        {
            "symbol": "LINK-USDC",
            "id": 15,
            "status": "TRADING"
        },
        {
            "symbol": "AVAX-USDC",
            "id": 16,
            "status": "TRADING"
        },
        {
            "symbol": "ADA-USDC",
            "id": 17,
            "status": "TRADING"
        }
    ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Trading pair symbol (e.g., "BTCUSDT") |
| `id` | number | Unique identifier for the instrument |
| `status` | string | Current trading status ("TRADING", "SUSPENDED", "DELISTED") |

**Example:**
```bash
curl -X GET https://godark.goquant.io/testnet/get-instruments \
  -H "Handshake-Token: <HANDSHAKE-TOKEN>"
```

**Error Responses:**
- `1000`: Invalid or missing handshake token
- `1500`: Internal server error

## WebSocket Subscriptions

GoDark provides real-time data streaming through WebSocket connections for order updates and orderbook data.

### Order Updates WebSocket

**Endpoint:** `wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>`

**Connection:**
```javascript
const ws = new WebSocket('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

ws.onopen = function() {
  console.log('Connected to GoDark order updates');
  
  // Subscribe to order updates
  ws.send(JSON.stringify({
    "account_id": "54429940153581569",
    "channel": "order_updates"
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Order update:', data);
};
```

#### Subscription

### ORDER UPDATES

To receive order updates, send a subscription message after connecting:

```json
{
  "account_id": "54429940153581569",
  "channel": "order_updates"
}
```

**Fields:**
- **account_id**: String - Your account identifier (account ID)
- **channel**: String - Must be "order_updates" for order notifications

#### Message Types

All messages are JSON objects with a `message_type` field indicating the event type. Below are the possible message types, their triggers, and schemas:


#### 1. ORDER_ACK

Acknowledges a new order added to the order book (no immediate fill).

**Triggers**: New GTC/GTD/AON order with no matches; AON waiting for complete fill.

**Schema**:
```json
{
  "message_type": "open",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 0,
  "ord_status": 0,
  "price": 65000.0,
  "quantity": 2.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "type": 1,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 0,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": 0.5,
  "cancel_reason": "",
  "reject_reason": "",
  "aon_status": "WAITING_FOR_COMPLETE_FILL"
}
```

#### 2. ORDER_FILL

Order completely filled.

**Triggers**: Complete fill for IOC/FOK/GTC/GTD/AON.

**Schema**:
```json
{
  "message_type": "filled",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 2,
  "ord_status": 2,
  "price": 65000.0,
  "quantity": 2.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "type": 1,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 0,
  "filled_qty": 2.5,
  "cum_fill": 2.5,
  "min_fill_size": 0.5,
  "cancel_reason": "",
  "reject_reason": "",
  "aon_status": ""
}
```

**Market Order Fill Example:**
```json
{
    "message_type": "filled",
    "in_time": 1755296342775731091,
    "out_time": 1755296342799293016,
    "order_id": 3295055959818245,
    "account_id": 1802060903219201,
    "symbol": "BTC-USDT",
    "exec_type": 2,
    "ord_status": 2,
    "price": 65000,
    "quantity": 1,
    "side": 0,
    "time_in_force": 0,
    "execution_type": 0,
    "visibility": 0,
    "is_nbbo_protected": "false",
    "expiry_time_ns_epoch": 0,
    "remaining_qty": 0,
    "filled_qty": 1,
    "cum_fill": 0,
    "min_fill_size": 0.5,
    "cancel_reason": "",
    "reject_reason": "",
    "aon_status": ""
}
```

#### 3. ORDER_PARTIAL_FILL

Order partially filled; remainder is working or canceled.

**Triggers**: Partial fill for IOC (remainder canceled) or GTC/GTD (remainder in book).

**Schema**:
```json
{
  "message_type": "partially_filled",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 1,
  "ord_status": 4,
  "price": 65000.0,
  "quantity": 1.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "type": 1,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 1.0,
  "filled_qty": 0.5,
  "cum_fill": 0.5,
  "min_fill_size": 0.5,
  "cancel_reason": "",
  "reject_reason": "",
  "aon_status": ""
}
```

#### 4. ORDER_CANCEL

Order canceled (fully or remainder).

**Triggers**: IOC with no/partial fill (remainder canceled); Manual cancel success.

**Schema**:
```json
{
  "message_type": "cancelled",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 4,
  "ord_status": 4,
  "price": 65000.0,
  "quantity": 2.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "type": 1,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 0,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": 0.5,
  "cancel_reason": "Order cancelled because no immediate fill was available for IOC order",
  "reject_reason": "",
  "aon_status": ""
}
```

#### 5. ORDER_REJECT

Order rejected (e.g., insufficient liquidity for FOK).

**Triggers**: FOK unable to fill completely.

**Schema**:
```json
{
  "message_type": "rejected",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 8,
  "ord_status": 8,
  "price": 65000.0,
  "quantity": 2.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 2.5,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": -1,
  "cancel_reason": "",
  "reject_reason": "Order rejected because insufficient liquidity available to fill entire FOK order",
  "aon_status": ""
}
```

#### 6. CANCEL_REJECT

Cancel request rejected (e.g., order not found).

**Triggers**: Failed cancel attempt.

**Schema**:
```json
{
  "message_type": "cancel_rejected",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 8,
  "ord_status": 0,
  "price": 65000.0,
  "quantity": 2.5,
  "side": 0,
  "time_in_force": 1,
  "execution_type": 0,
  "visibility": 1,
  "is_nbbo_protected": "true",
  "expiry_time_ns_epoch": 1640995200000000000,
  "remaining_qty": 2.5,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": 0.5,
  "cancel_reason": "",
  "reject_reason": "Cancel request rejected because the specified order could not be found",
  "aon_status": ""
}
```

#### 7. ORDER_MODIFY

Order modification success (e.g., quantity change).

**Triggers**: Successful modify (quantity only in provided code).

**Schema**:
```json
{
  "message_type": "modified",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 5,
  "ord_status": 0,
  "price": -1,
  "quantity": 3.0,
  "side": -1,
  "time_in_force": -1,
  "execution_type": -1,
  "visibility": -1,
  "is_nbbo_protected": "false",
  "expiry_time_ns_epoch": 0,
  "remaining_qty": 3.0,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": -1,
  "cancel_reason": "",
  "reject_reason": "",
  "aon_status": ""
}
```

#### 8. MODIFY_REJECT

Order modification rejected (e.g., order not found).

**Triggers**: Failed modify attempt.

**Schema**:
```json
{
  "message_type": "modify_rejected",
  "in_time": 1755296342775731091,
  "out_time": 1755296342799293016,
  "order_id": 123456789,
  "account_id": "54429940153581569",
  "symbol": "BTCUSD",
  "exec_type": 8,
  "ord_status": 0,
  "price": -1,
  "quantity": -1,
  "side": -1,
  "time_in_force": -1,
  "execution_type": -1,
  "visibility": -1,
  "is_nbbo_protected": "false",
  "expiry_time_ns_epoch": 0,
  "remaining_qty": 0,
  "filled_qty": 0,
  "cum_fill": 0,
  "min_fill_size": -1,
  "cancel_reason": "",
  "reject_reason": "Modify request rejected because the specified order could not be found",
  "aon_status": ""
}
```





#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message_type` | string | Event type identifier: "open", "filled", "partially_filled", "cancelled", "rejected", "cancel_rejected", "modified", "modify_rejected" |
| `in_time` | integer | Order entry timestamp in nanoseconds since Unix epoch |
| `out_time` | integer | Order processing completion timestamp in nanoseconds since Unix epoch |
| `order_id` | integer | Unique order identifier |
| `account_id` | string | Account identifier |
| `symbol` | string | Trading symbol (e.g., "BTCUSD") |
| `exec_type` | integer | Execution type (0=New, 1=Partial Fill, 2=Fill, 4=Canceled, 5=Replaced, 8=Rejected) |
| `ord_status` | integer | Order status (0=New, 1=Partially Filled, 2=Filled, 4=Canceled, 8=Rejected) |
| `price` | double | Order price (-1 when not applicable) |
| `quantity` | double | Order quantity (filled amount for partial fills, -1 when not applicable) |
| `side` | integer | Order side (0 = Bid/Buy, 1 = Ask/Sell, -1 when not applicable) |
| `time_in_force` | integer | Time in force code (1=GTC, 3=IOC, 4=FOK, 6=GTD, -1 when not applicable) |
| `execution_type` | integer | Execution type code (-1 when not applicable) |
| `type` | integer | Order type (0=MARKET, 1=LIMIT, -1 when not applicable) |
| `visibility` | integer | Order visibility code (-1 when not applicable) |
| `is_nbbo_protected` | string | NBBO protection status ("true", "false") |
| `expiry_time_ns_epoch` | integer | Expiry timestamp in nanoseconds since epoch (0 when not applicable) |
| `remaining_qty` | double | Remaining unfilled quantity (partial fills only, -1 when not applicable) |
| `filled_qty` | double | Quantity filled in this specific update (0 when not applicable) |
| `cum_fill` | double | Total cumulative quantity filled since order placement (0 when not applicable) |
| `min_fill_size` | double | Minimum fill size (-1 when not applicable) |
| `cancel_reason` | string | Grammatically correct reason for cancellation (empty string when not applicable) |
| `reject_reason` | string | Grammatically correct reason for rejection (empty string when not applicable) |
| `aon_status` | string | All-or-None status (AON orders only, empty string when not applicable) |


**Message Type Descriptions:**
- `open`: Order acknowledged and added to order book
- `filled`: Order completely executed
- `partially_filled`: Order partially executed (remainder working or cancelled)
- `cancelled`: Order cancelled successfully
- `rejected`: Order rejected due to business rules
- `cancel_rejected`: Cancel request rejected
- `modified`: Order modification successful
- `modify_rejected`: Order modification rejected

**Sentinel Values for Normalized JSON:**
- **Numeric fields**: `-1` when field is not applicable to the message type
- **String fields**: `""` (empty string) when field is not applicable
- **Boolean fields**: `"false"` when field is not applicable
- **Timestamp fields**: `0` when field is not applicable

#### Complete JavaScript Example

```javascript
class OrderUpdatesWebSocket {
    constructor(url, accountName) {
        this.url = url;
        this.accountName = accountName;
        this.ws = null;
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected to Order Updates WebSocket');
            this.subscribe();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleOrderUpdate(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Implement reconnection logic here
        };
    }
    
    subscribe() {
        const subscription = {
            account_name: this.accountName,
            channel: "order_updates"
        };
        this.ws.send(JSON.stringify(subscription));
    }
    
    handleOrderUpdate(data) {
        switch(data.message_type) {
            case 'open':
                console.log('Order acknowledged:', data);
                break;
            case 'filled':
                console.log('Order filled:', data);
                break;
            case 'partially_filled':
                console.log('Order partially filled:', data);
                break;
            case 'cancelled':
                console.log('Order canceled:', data);
                break;
            case 'rejected':
                console.log('Order rejected:', data);
                break;
            case 'cancel_rejected':
                console.log('Cancel rejected:', data);
                break;
            case 'modified':
                console.log('Order modified:', data);
                break;
            case 'modify_rejected':
                console.log('Modify rejected:', data);
                break;
            default:
                console.log('Unknown message type:', data);
        }
    }
}

// Usage
const orderUpdates = new OrderUpdatesWebSocket(
    'wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>',
    '54429940153581569'
);
```

### Account Balance Websocket

**Endpoint:** `wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>`

**Connection:**
```javascript
const ws = new WebSocket('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

ws.onopen = function() {
  console.log('Connected to GoDark order updates');
  
  // Subscribe to order updates
  ws.send(JSON.stringify({
    "account_id": "54429940153581569",
    "channel": "account_balance"
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Account balance update:', data);
};
```

#### Account Balance Subscription

**Request:**
```json
{
 
  "account_id": "57786925246840834",
  "channel": "account_balance"

}
```

**Response:**

**When account exists**, you get:
```json
{"type":"subscribed","code":200,"stream":"account_balance","account_id":40046275067906}
```
…and then an **initial snapshot** for that stream 

**If account does not exist:**
```json
{"type":"Error","code":1406,"message":"account not found"}
```

**If stream unknown:**
```json
{"type":"Error","code":1400,"message":"unknown stream"}
```



**snapshot structure**

- Sent on **subscribe**, and **balance changes**.
```json
{
  "channel": "account_balance",
  "account_id": 40046275067906,
  "data": {
    "balances": {
      "BTC":  { "available": 1.50000000, "locked": 0.10000000, "total": 1.60000000 },
      "ETH":  { "available": 0.00000000, "locked": 0.00000000, "total": 0.00000000 },
      "USDT": { "available": 2500.00,    "locked": 97500.00,   "total": 100000.00 }
    },
    "version": 2,
    "timestamp": "2025-08-19T10:00:00.123Z"
  }
}
```



### Account Transactions Websocket

**Endpoint:** `wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>`

**Connection:**
```javascript
const ws = new WebSocket('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

ws.onopen = function() {
  console.log('Connected to GoDark order updates');
  
  // Subscribe to order updates
  ws.send(JSON.stringify({
    "account_id": "54429940153581569",
    "channel": "account_transactions"
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Account transactions update:', data);
};
```

#### Account Transactions Subscription


**Request:**
```json
{
 
  "account_id": "57786925246840834",
  "channel": "account_transactions"

}
```

**Response:**

**When account exists**, you get:
```json
{"type":"subscribed","code":200,"stream":"account_balance","account_id":40046275067906}
```
…and then an **initial snapshot** for that stream 

**If account does not exist:**
```json
{"type":"Error","code":1406,"message":"account not found"}
```

**If stream unknown:**
```json
{"type":"Error","code":1400,"message":"unknown stream"}
```

**snapshot structure**

- Sent on **subscribe**  and after each trade as 

```json
{
  "type": "account_transactions",
  "account_id": 40046275067906,
  "data": {
    "transactions": [
      {
        "transaction_id": 1234,                // internal monotonic seq
        "trade_id": 7785559168723470166,       // trade id from your request
        "asset": "BTC",                         // one leg per asset
        "amount": 1.00000000,                   // Added
        "timestamp": "2025-08-19T10:33:24.962Z" // server send time
      },
      {
        "transaction_id": 1235,
        "trade_id": 7785559168723470166,
        "asset": "USDT",
        "amount": -65000.00,                  // Subtracted
        "timestamp": "2025-08-19T10:33:24.962Z"
      }
    ]
  }
}
```


#### Field Descriptions

| Field        | Type         | Required | Notes                                       |
|--------------|--------------|----------|---------------------------------------------|
| `channel`    | string       | yes      | `"account_balance"` or `"transaction_history"`|
| `account_id` | uint64/str   | yes      | Must exist                                  |

#### Response Codes for account_transactions & account_balance

| Code | Name                   | When it appears                                                                          |
|-----:|------------------------|-------------------------------------------------------------------------------------------|
|  200 | OK                     | Success  |
| 1400 | BAD_REQUEST            | Unknown command/stream or malformed high-level request.                                   |
| 1406 | ACCOUNT_NOT_FOUND      | The referenced `account_id` does not exist.                                              |




### Orderbook WebSocket

**Endpoint:** `wss://godark-testnet.goquant.io/ws/public?handshake_token=<HANDSHAKE-TOKEN>`

**Connection:**
```javascript
const ws = new WebSocket('wss://godark-testnet.goquant.io/ws/public?handshake_token=<HANDSHAKE-TOKEN>');

ws.onopen = function() {
    console.log('Connected to OrderBook WebSocket');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};
```

**Supported Actions:**
- `subscribe` - Subscribe to real-time updates
- `unsubscribe` - Unsubscribe from updates  
- `one-shot` - Get a one-time snapshot

**Supported Channels:**
- `orderbook_l1` - Best bid/offer updates (depth: 1)
- `orderbook_l2` - Full orderbook depth updates (configurable depth)
- `snapshot` - One-time orderbook snapshot
- `trades` - Real-time trade execution updates

#### L1 Subscription (Best Bid/Offer)

**Request:**
```json
{
  "action": "subscribe",
  "channel": "orderbook_l1",
  "symbols": ["BTC-USDT"],
  "account_name": ""
}
```

**Response:**
```json
{
  "channel": "orderbook_l1",
  "timestamp": 1752196768710,
  "data": {
    "msg": "subscription_confirmed",
    "symbols": ["BTC-USDT"],
    "depth": 1
  }
}
```

**L1 Update Messages:**

When the best bid or ask changes, you'll receive real-time L1 updates:

```json
{
  "channel": "orderbook_l1",
  "timestamp": 1752196770825,
  "data": {
    "msg": "l1_update",
    "symbol": "BTC-USDT",
    "best_bid": 65420.5,
    "bid_size": 2.75,
    "best_ask": 65421.0,
    "ask_size": 1.80
  }
}
```

**L1 Update with Missing Side:**
```json
{
  "channel": "orderbook_l1",
  "timestamp": 1752196772940,
  "data": {
    "msg": "l1_update",
    "symbol": "BTC-USDT",
    "best_bid": 65420.5,
    "bid_size": 2.75,
    "best_ask": null,
    "ask_size": 0.0
  }
}
```

#### L2 Subscription (Full Orderbook Depth)

**Request:**
```json
{
  "action": "subscribe",
  "channel": "orderbook_l2",
  "symbols": ["BTC-USDT"],
  "depth": 10
}
```

**Response:**
```json
{
  "channel": "orderbook_l2",
  "timestamp": 1752196770713,
  "data": {
    "msg": "subscription_confirmed",
    "symbols": ["BTC-USDT"],
    "depth": 10
  }
}
```

**L2 Update Messages:**

When orders are placed, modified, or canceled, you'll receive L2 updates:

```json
{
  "channel": "orderbook_l2",
  "timestamp": 1752196772734,
  "data": {
    "msg": "l2_update",
    "symbol": "BTC-USDT",
    "bids": [
      [65420.5, 2.75, 3],
      [65420.0, 1.50, 2],
      [65419.5, 0.85, 1],
      [65419.0, 3.25, 4],
      [65418.5, 1.20, 2]
    ],
    "asks": [
      [65421.0, 1.80, 2],
      [65421.5, 2.10, 3],
      [65422.0, 0.95, 1],
      [65422.5, 1.65, 2],
      [65423.0, 2.40, 3]
    ]
  }
}
```

**L2 Update with Price Level Removal:**
```json
{
  "channel": "orderbook_l2",
  "timestamp": 1752196774856,
  "data": {
    "msg": "l2_update",
    "symbol": "BTC-USDT",
    "bids": [
      [65420.5, 2.75, 3],
      [65420.0, 1.50, 2],
      [65419.0, 3.25, 4],
      [65418.5, 1.20, 2]
    ],
    "asks": [
      [65421.0, 1.80, 2],
      [65421.5, 2.10, 3],
      [65422.0, 0.95, 1]
    ]
  }
}
```

#### Trades Subscription (Real-time Trade Updates)

Subscribe to real-time trade execution updates for specified symbols. Trade updates are sent immediately when trades occur in the order book.

**Request:**
```json
{
  "action": "subscribe",
  "channel": "trades",
  "symbols": ["BTC-USDT"]
}
```

**Response:**
```json
{
  "channel": "trades",
  "timestamp": 1753388326173,
  "data": {
    "msg": "subscription_confirmed",
    "symbols": ["BTC-USDT"]
  }
}
```

**Trade Update Messages:**

When trades are executed, you'll receive real-time trade updates in a simplified exchange-like format:

```json
{
  "channel": "trades",
  "timestamp": 1753388326173,
  "data": {
    "symbol": "BTC-USDT",
    "price": 65000.00000000,
    "quantity": 0.10000000,
    "side": "buy"
  }
}
```

**Trade Update with Sell Side:**
```json
{
  "channel": "trades",
  "timestamp": 1753388327845,
  "data": {
    "symbol": "BTC-USDT",
    "price": 64999.50000000,
    "quantity": 0.25000000,
    "side": "sell"
  }
}
```

**Trade Message Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Trading pair symbol |
| `price` | number | Trade execution price |
| `quantity` | number | Trade execution quantity |
| `side` | string | Aggressor side ("buy" or "sell") |

#### Snapshot Request (One-time Data)

**Request:**
```json
{
  "action": "one-shot",
  "channel": "snapshot",
  "symbols": ["BTC-USDT"]
}
```

**Response:**
```json
{
  "channel": "snapshot",
  "timestamp": 1752196766707,
  "data": {
    "msg": "snapshot",
    "symbol": "BTC-USDT",
    "depth": 25,
    "bids": [
      [65420.5, 2.75, 3],
      [65420.0, 1.50, 2],
      [65419.5, 0.85, 1],
      [65419.0, 3.25, 4],
      [65418.5, 1.20, 2],
      [65418.0, 2.80, 5],
      [65417.5, 1.95, 3],
      [65417.0, 0.65, 1],
      [65416.5, 2.15, 4],
      [65416.0, 1.40, 2],
      [65415.5, 3.05, 6],
      [65415.0, 0.90, 1],
      [65414.5, 1.75, 3],
      [65414.0, 2.30, 4],
      [65413.5, 1.10, 2],
      [65413.0, 2.65, 5],
      [65412.5, 1.85, 3],
      [65412.0, 0.95, 1],
      [65411.5, 2.40, 4],
      [65411.0, 1.60, 2],
      [65410.5, 3.15, 6],
      [65410.0, 0.80, 1],
      [65409.5, 2.00, 3],
      [65409.0, 1.45, 2],
      [65408.5, 2.90, 5]
    ],
    "asks": [
      [65421.0, 1.80, 2],
      [65421.5, 2.10, 3],
      [65422.0, 0.95, 1],
      [65422.5, 1.65, 2],
      [65423.0, 2.40, 3],
      [65423.5, 1.25, 2],
      [65424.0, 2.85, 5],
      [65424.5, 1.70, 3],
      [65425.0, 0.85, 1],
      [65425.5, 2.30, 4],
      [65426.0, 1.55, 2],
      [65426.5, 2.95, 6],
      [65427.0, 1.15, 2],
      [65427.5, 2.60, 4],
      [65428.0, 1.90, 3],
      [65428.5, 0.75, 1],
      [65429.0, 2.20, 4],
      [65429.5, 1.35, 2],
      [65430.0, 2.80, 5],
      [65430.5, 1.05, 1],
      [65431.0, 2.45, 4],
      [65431.5, 1.70, 3],
      [65432.0, 0.90, 1],
      [65432.5, 2.10, 3],
      [65433.0, 1.50, 2]
    ]
  }
}
```

#### Unsubscribe Request

**Unsubscribe from Specific Symbols:**
```json
{
  "action": "unsubscribe",
  "channel": "orderbook_l2",
  "symbols": ["BTC-USDT"]
}
```

**Unsubscribe from Multiple Symbols:**
```json
{
  "action": "unsubscribe",
  "channel": "orderbook_l2", 
  "symbols": ["BTC-USDT", "ETH-USDT"]
}
```

**Unsubscribe from Single Symbol:**
```json
{
  "action": "unsubscribe",
  "channel": "trades",
  "symbol": "BTC-USDT"
}
```

**Unsubscribe from All Symbols (Legacy):**
```json
{
  "action": "unsubscribe"
}
```

#### Unsubscribe Responses

**Successful Unsubscribe:**
```json
{
  "channel": "orderbook_l2",
  "timestamp": 1753812200000,
  "data": {
    "msg": "unsubscription_confirmed",
    "symbols": ["BTC-USDT", "ETH-USDT"]
  }
}
```

**Symbol Not Subscribed Error:**
```json
{
  "type": "error",
  "code": 404,
  "message": "Symbol 'INVALID-SYMBOL' was not subscribed to channel 'orderbook_l2'",
  "channel": "orderbook_l2",
  "symbol": "INVALID-SYMBOL"
}
```

**Partial Unsubscribe (Mixed Results):**

**Request:**
```json
{
  "action": "unsubscribe",
  "channel": "orderbook_l2",
  "symbols": ["BTC-USDT", "NOT-SUBSCRIBED", "ETH-USDT"]
}
```

**Responses:**
```json
// Error for non-subscribed symbol
{
  "type": "error", 
  "code": 404,
  "message": "Symbol 'NOT-SUBSCRIBED' was not subscribed to channel 'orderbook_l2'",
  "channel": "orderbook_l2",
  "symbol": "NOT-SUBSCRIBED"
}

// Confirmation for successfully unsubscribed symbols
{
  "channel": "orderbook_l2",
  "timestamp": 1753812200000,
  "data": {
    "msg": "unsubscription_confirmed", 
    "symbols": ["BTC-USDT", "ETH-USDT"]
  }
}
```

#### Unsubscribe Behavior

- **Selective unsubscribe:** Only removes subscriptions for specified symbols
- **Validation:** Checks if symbols were actually subscribed before unsubscribing
- **Error handling:** Returns 404 errors for symbols that weren't subscribed
- **Partial success:** Processes valid symbols even if some are invalid
- **Legacy support:** Unsubscribe without symbols removes all subscriptions (backward compatibility)

**Depth Levels:**
- `1`: Best bid/offer only (L1)
- `5`: Top 5 levels
- `10`: Top 10 levels
- `20`: Top 20 levels
- `25`: Top 25 levels
- `50`: Top 50 levels

**Price Level Format:** `[price, quantity, count]`
- **price:** Price level
- **quantity:** Total quantity at this price
- **count:** Number of orders at this price

#### Error Response Format

**Invalid Symbol - OrderBook Not Found:**
```json
{
  "type": "error",
  "code": 404,
  "message": "OrderBook not found for symbol: BTC-USDT-SWAP",
  "channel": "orderbook_l2",
  "symbol": "BTC-USDT-SWAP"
}
```

**Invalid Request Format:**
```json
{
  "channel": "error",
  "timestamp": 1752196800000,
  "data": {
    "msg": "error",
    "code": 400,
    "message": "Invalid request format"
  }
}
```

**Missing Symbols:**
```json
{
  "type": "error",
  "code": 400,
  "message": "No valid symbols provided. Use 'symbol' or 'symbols' field.",
  "channel": "orderbook_l1"
}
```

#### Partial Success Handling

When subscribing to multiple symbols where some are valid and others are invalid, you'll receive:

1. **Error messages for each invalid symbol**
2. **Confirmation message only for valid symbols**

**Example - Mixed Results:**

**Request:**
```json
{
  "action": "subscribe",
  "channel": "orderbook_l2", 
  "symbols": ["BTC-USDT", "INVALID-SYMBOL", "ETH-USDT"]
}
```

**Responses:**
```json
// Error for invalid symbol
{
  "type": "error",
  "code": 404,
  "message": "OrderBook not found for symbol: INVALID-SYMBOL",
  "channel": "orderbook_l2",
  "symbol": "INVALID-SYMBOL"
}

// Confirmation only for valid symbols
{
  "channel": "orderbook_l2",
  "timestamp": 1753812187907,
  "data": {
    "msg": "subscription_confirmed",
    "symbols": ["BTC-USDT", "ETH-USDT"],
    "depth": 5
  }
}
```

#### OrderBook Availability

**Important:** Subscriptions are only confirmed for symbols that have active OrderBooks. Before subscribing:

1. **Check available instruments** using `GET /get-instruments`
2. **Verify OrderBook exists** - only symbols with trading activity will have OrderBooks
3. **Handle 404 errors gracefully** for symbols without OrderBooks

**Available vs. Trading Symbols:**
- **Available symbols:** Listed in `/get-instruments` response
- **Active OrderBooks:** Only symbols with recent trading activity have OrderBooks
- **Subscription validation:** Only symbols with OrderBooks can be subscribed to

#### Complete JavaScript Example

```javascript
class OrderBookWebSocket {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('Connected to OrderBook WebSocket');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }
    
    handleMessage(data) {
        // Handle error messages
        if (data.type === 'error') {
            if (data.code === 404) {
                if (data.message.includes('OrderBook not found')) {
                    console.error(`OrderBook not found for symbol ${data.symbol} on channel ${data.channel}`);
                    this.handleMissingOrderBook(data.symbol, data.channel);
                } else if (data.message.includes('was not subscribed')) {
                    console.error(`Unsubscribe failed: ${data.message}`);
                    this.handleUnsubscribeError(data.symbol, data.channel);
                }
            } else if (data.code === 400) {
                console.error(`Bad request: ${data.message}`);
            }
            return;
        }
        
        // Handle normal channel messages
        switch(data.channel) {
            case 'orderbook_l1':
                if (data.data.msg === 'subscription_confirmed') {
                    console.log('L1 subscription confirmed for:', data.data.symbols);
                } else if (data.data.msg === 'unsubscription_confirmed') {
                    console.log('L1 unsubscription confirmed for:', data.data.symbols);
                } else {
                    console.log('L1 Update:', data);
                }
                break;
            case 'orderbook_l2':
                if (data.data.msg === 'subscription_confirmed') {
                    console.log('L2 subscription confirmed for:', data.data.symbols);
                } else if (data.data.msg === 'unsubscription_confirmed') {
                    console.log('L2 unsubscription confirmed for:', data.data.symbols);
                } else {
                    console.log('L2 Update:', data);
                }
                break;
            case 'snapshot':
                console.log('Snapshot:', data);
                break;
            case 'trades':
                if (data.data.msg === 'subscription_confirmed') {
                    console.log('Trades subscription confirmed for:', data.data.symbols);
                } else if (data.data.msg === 'unsubscription_confirmed') {
                    console.log('Trades unsubscription confirmed for:', data.data.symbols);
                } else {
                    console.log('Trade Update:', data);
                }
                break;
            case 'error':
                console.error('Channel Error:', data);
                break;
            default:
                console.log('Unknown message:', data);
        }
    }
    
    handleMissingOrderBook(symbol, channel) {
        console.warn(`Symbol ${symbol} does not have an active OrderBook`);
        // Could implement fallback logic here:
        // - Check /get-instruments for available symbols
        // - Subscribe to alternative symbols
        // - Notify user interface about unavailable symbols
    }
    
    handleUnsubscribeError(symbol, channel) {
        console.warn(`Symbol ${symbol} was not subscribed to channel ${channel}`);
        // Handle unsubscribe error - symbol wasn't subscribed
    }
    
    subscribeL1(symbols) {
        const request = {
            action: "subscribe",
            channel: "orderbook_l1",
            symbols: symbols,
            account_name: ""
        };
        this.ws.send(JSON.stringify(request));
    }
    
    subscribeL2(symbols, depth = 10) {
        const request = {
            action: "subscribe",
            channel: "orderbook_l2",
            symbols: symbols,
            depth: depth
        };
        this.ws.send(JSON.stringify(request));
    }
    
    subscribeTrades(symbols) {
        const request = {
            action: "subscribe",
            channel: "trades",
            symbols: symbols
        };
        this.ws.send(JSON.stringify(request));
    }
    
    requestSnapshot(symbols) {
        const request = {
            action: "one-shot",
            channel: "snapshot",
            symbols: symbols
        };
        this.ws.send(JSON.stringify(request));
    }
    
    unsubscribe(channel, symbols) {
        const request = {
            action: "unsubscribe",
            channel: channel,
            symbols: symbols
        };
        this.ws.send(JSON.stringify(request));
    }
    
    unsubscribeAll() {
        // Legacy unsubscribe - removes all subscriptions
        const request = {
            action: "unsubscribe"
        };
        this.ws.send(JSON.stringify(request));
    }
}

// Usage with error handling
const orderBook = new OrderBookWebSocket('wss://godark-testnet.goquant.io/ws/public?handshake_token=<HANDSHAKE-TOKEN>');

// Subscribe to L1 updates (may receive 404 errors for symbols without OrderBooks)
orderBook.subscribeL1(['BTC-USDT', 'INVALID-SYMBOL']);

// Subscribe to L2 updates with depth 10
orderBook.subscribeL2(['BTC-USDT'], 10);

// Subscribe to trades updates
orderBook.subscribeTrades(['BTC-USDT']);

// Request snapshot
orderBook.requestSnapshot(['BTC-USDT']);

// Unsubscribe from specific symbols
orderBook.unsubscribe('orderbook_l2', ['BTC-USDT']);
orderBook.unsubscribe('trades', ['BTC-USDT']);

// Unsubscribe from all (legacy)
orderBook.unsubscribeAll();
```

### Analytics WebSocket

**Endpoint:** `wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>`

The Analytics WebSocket provides real-time trading analytics data including volume metrics, maker/taker ratios, and execution quality statistics. Analytics subscriptions are **public** and do not require account authentication.

**Connection:**
```javascript
const ws = new WebSocket('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

ws.onopen = function() {
  console.log('Connected to GoDark Analytics');
  
  // Subscribe to aggregate analytics (all assets combined)
  ws.send(JSON.stringify({
    "channel": "analytics"
  }));
  
  // Or subscribe to specific asset analytics
  ws.send(JSON.stringify({
    "channel": "analytics",
    "asset": "BTC-USDT"
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Analytics update:', data);
};
```

#### Subscription Types

**1. Aggregate Analytics (All Assets Combined)**

Subscribe to analytics data for all trading activity across all assets:

```json
{
  "channel": "analytics"
}
```

**Response:**
```json
{
  "status": "subscribed",
  "channel": "analytics"
}
```

**2. Asset-Specific Analytics**

Subscribe to analytics data for a specific trading pair:

```json
{
  "channel": "analytics",
  "asset": "BTC-USDT"
}
```

**Response:**
```json
{
  "status": "subscribed",
  "channel": "analytics",
  "asset": "BTC-USDT"
}
```

#### Analytics Data Format

Analytics data is broadcast every **15 seconds** and includes comprehensive trading metrics:

**Aggregate Analytics Update:**
```json
{
  "volume_and_liquidity_analytics": {
    "matched_volume": {
      "units": 2150.000000,
      "notional_usd": 645000.000000
    },
    "liquidity_submitted": 1558708.781000,
    "trade_count": 358,
    "order_count": 1288
  },
  "trading_behavior_analysis": {
    "buy_sell_ratio": 1.18,
    "maker_taker_ratio": 2.15
  },
  "execution_quality_metrics": {
    "fill_rate": 0.71,
    "average_time_to_fill": "N/A",
    "average_trade_size": 6.01
  }
}
```

**Asset-Specific Analytics Update:**
```json
{
  "asset": "BTC-USDT",
  "volume_and_liquidity_analytics": {
    "matched_volume": {
      "units": 150.000000,
      "notional_usd": 45000.000000
    },
    "liquidity_submitted": 111514.898500,
    "trade_count": 25,
    "order_count": 92
  },
  "trading_behavior_analysis": {
    "buy_sell_ratio": 1.25,
    "maker_taker_ratio": 2.40
  },
  "execution_quality_metrics": {
    "fill_rate": 0.67,
    "average_time_to_fill": "N/A",
    "average_trade_size": 6.00
  }
}
```

#### Field Descriptions

**Volume and Liquidity Analytics:**

| Field | Type | Description |
|-------|------|-------------|
| `matched_volume.units` | number | Total executed volume in trading units |
| `matched_volume.notional_usd` | number | Total executed volume in USD value |
| `liquidity_submitted` | number | Cumulative notional value of all orders placed |
| `trade_count` | integer | Total number of trades executed |
| `order_count` | integer | Total number of orders submitted |

**Trading Behavior Analysis:**

| Field | Type | Description |
|-------|------|-------------|
| `buy_sell_ratio` | number | Ratio of buy aggressor volume to sell aggressor volume |
| `maker_taker_ratio` | number | Ratio of maker volume to taker volume |

**Execution Quality Metrics:**

| Field | Type | Description |
|-------|------|-------------|
| `fill_rate` | number | Ratio of matched volume to submitted volume (0.0 to 1.0) |
| `average_time_to_fill` | string | Average time from order submission to fill (currently "N/A") |
| `average_trade_size` | number | Average size per trade in units |

#### Key Concepts

**Buy/Sell Ratio:**
- Measures aggressor-side trading behavior
- Values > 1.0 indicate more buy aggression (buyers initiating trades)
- Values < 1.0 indicate more sell aggression (sellers initiating trades)
- Formula: `aggressive_buy_volume / aggressive_sell_volume`

**Maker/Taker Ratio:**
- Measures liquidity provision vs consumption
- Values > 1.0 indicate more liquidity provision (maker activity)
- Values < 1.0 indicate more liquidity consumption (taker activity) 
- Formula: `total_maker_volume / total_taker_volume`

**Fill Rate:**
- Measures execution efficiency
- Values closer to 1.0 indicate better execution rates
- Formula: `matched_volume / submitted_volume`

#### Error Handling

**Invalid Asset Error:**
```json
{
  "error": "Invalid asset: INVALID-SYMBOL"
}
```

**Connection Errors:**
- Analytics subscriptions are automatically cleaned up when WebSocket connections close
- No manual unsubscription required
- Reconnection will require re-subscription

#### Complete JavaScript Example

```javascript
class AnalyticsWebSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected to Analytics WebSocket');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleAnalyticsUpdate(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('Analytics WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('Analytics WebSocket connection closed');
            // Implement reconnection logic here
            setTimeout(() => this.connect(), 5000);
        };
    }
    
    subscribeToAggregate() {
        const subscription = {
            channel: "analytics"
        };
        this.ws.send(JSON.stringify(subscription));
        console.log('Subscribed to aggregate analytics');
    }
    
    subscribeToAsset(asset) {
        const subscription = {
            channel: "analytics",
            asset: asset
        };
        this.ws.send(JSON.stringify(subscription));
        console.log(`Subscribed to analytics for ${asset}`);
    }
    
    handleAnalyticsUpdate(data) {
        if (data.status === "subscribed") {
            console.log('Subscription confirmed:', data);
            return;
        }
        
        if (data.error) {
            console.error('Analytics error:', data.error);
            return;
        }
        
        // Handle analytics data
        if (data.asset) {
            console.log(`Analytics for ${data.asset}:`, data);
        } else {
            console.log('Aggregate analytics:', data);
        }
        
        // Extract key metrics
        const volumeData = data.volume_and_liquidity_analytics;
        const behaviorData = data.trading_behavior_analysis;
        const qualityData = data.execution_quality_metrics;
        
        console.log(`Volume: ${volumeData.matched_volume.notional_usd.toLocaleString()} USD`);
        console.log(`Trades: ${volumeData.trade_count}, Orders: ${volumeData.order_count}`);
        console.log(`Buy/Sell: ${behaviorData.buy_sell_ratio.toFixed(2)}`);
        console.log(`Maker/Taker: ${behaviorData.maker_taker_ratio.toFixed(2)}`);
        console.log(`Fill Rate: ${(qualityData.fill_rate * 100).toFixed(1)}%`);
    }
}

// Usage Examples
const analytics = new AnalyticsWebSocket('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

// Subscribe to aggregate analytics after connection
setTimeout(() => {
    analytics.subscribeToAggregate();
}, 1000);

// Subscribe to specific asset analytics
setTimeout(() => {
    analytics.subscribeToAsset('BTC-USDT');
    analytics.subscribeToAsset('ETH-USDT');
}, 2000);
```

#### Multi-Asset Analytics Dashboard

```javascript
class AnalyticsDashboard {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.metrics = {};
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('Analytics Dashboard connected');
            
            // Subscribe to aggregate and multiple assets
            this.subscribeToAggregate();
            ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].forEach(asset => {
                this.subscribeToAsset(asset);
            });
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateMetrics(data);
        };
    }
    
    subscribeToAggregate() {
        this.ws.send(JSON.stringify({ channel: "analytics" }));
    }
    
    subscribeToAsset(asset) {
        this.ws.send(JSON.stringify({ channel: "analytics", asset: asset }));
    }
    
    updateMetrics(data) {
        if (data.status === "subscribed" || data.error) return;
        
        const key = data.asset || 'AGGREGATE';
        this.metrics[key] = data;
        
        // Update dashboard UI
        this.renderMetrics(key, data);
    }
    
    renderMetrics(key, data) {
        const behavior = data.trading_behavior_analysis;
        const volume = data.volume_and_liquidity_analytics;
        
        console.log(`=== ${key} ===`);
        console.log(`Volume: ${volume.matched_volume.notional_usd.toLocaleString()} USD`);
        console.log(`Trades: ${volume.trade_count}, Orders: ${volume.order_count}`);
        console.log(`Buy/Sell: ${behavior.buy_sell_ratio.toFixed(2)}`);
        console.log(`Maker/Taker: ${behavior.maker_taker_ratio.toFixed(2)}`);
        console.log('---');
    }
    
    getMetrics(asset = null) {
        return asset ? this.metrics[asset] : this.metrics;
    }
}

// Usage
const dashboard = new AnalyticsDashboard('wss://godark.goquant.io/ws/testnet?handshake_token=<HANDSHAKE-TOKEN>');

// Get specific asset metrics after some time
setTimeout(() => {
    const btcMetrics = dashboard.getMetrics('BTC-USDT');
    const allMetrics = dashboard.getMetrics();
    console.log('BTC Analytics:', btcMetrics);
    console.log('All Analytics:', allMetrics);
}, 30000);
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Endpoint not found
- `500 Internal Server Error`: Server error

### Error Response Format

All error responses follow a standardized format with numeric error codes:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1000,
  "data": {
    "message": "Invalid or missing handshake token"
  }
}
```

### Success Response Format

All successful responses use code 0:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 0,
  "data": {
    "order_id": 123456789,
    "nbbo_info": "NBBO protection active"
  }
}
```

### Numeric Error Codes

| Code | Category | Description |
|------|----------|-------------|
| `0` | Success | Operation completed successfully |
| `1000` | Auth | Invalid or missing handshake token |
| `1001` | Auth | Invalid API credentials |
| `1100` | System | Internal server error |
| `1101` | System | Invalid JSON format |
| `1102` | System | Invalid content type |
| `1200` | Account | User already exists |
| `1201` | Account | Account not found |
| `1300` | Database | Database operation failed |
| `1301` | Database | Database constraint violation |
| `1400` | Trading | Order operation error (generic) |
| `1401` | Validation | Validation error - missing or invalid fields |
| `1402` | Validation | Invalid JSON format in request body |
| `1403` | Validation | Invalid or missing Content-Type header |
| `1429` | Rate Limit | Rate limited - too many requests |
| `1430` | Trade Rules | Trade rule violation (min size, quote rest) |
| `1431` | NBBO | NBBO validation failed |
| `1500` | System | Internal server error |
| `1501` | System | Service unavailable |

### Client Error Handling

Simple client-side error handling pattern:

```javascript
if (response.code === 0) {
  // Success - use response.data
  console.log("Success:", response.data);
} else {
  // Error - check response.code and response.data.message
  console.log(`Error ${response.code}: ${response.data?.message || "Unknown error"}`);
}
```

## Rate Limits

The GoDark trading system enforces several rate limits to ensure fair access and system stability:

### Trading Rate Limits

**Primary Rate Limit:**
- **1 action per 100 microseconds (0.0001 seconds) per symbol**
- Applies to all order operations: place, cancel, modify
- Tracked per symbol per account
- Violations return HTTP 400 with error code `1429`

**Quote Rest Period:**
- **100 microseconds minimum between quote updates**
- Applies specifically to modify operations that change order price
- Prevents rapid price manipulation
- Violations return HTTP 400 with error code `1430`

**Minimum Order Size:**
- **$1,000 USDT minimum notional value**
- Calculated as: `price × quantity`
- Prevents micro-order spam
- Violations return HTTP 400 with error code `1430`

### Rate Limit Best Practices

1. **Implement exponential backoff** when receiving rate limit errors
2. **Track your request rate** to stay within limits
3. **Use batch operations** when possible to reduce request count
4. **Monitor rate limit headers** to prevent violations
5. **Consider order aggregation** to meet minimum size requirements

### Example Rate Limit Error Response

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "code": 1429,
  "data": {
    "message": "Rate limited: 1 action per 100μs per symbol"
  }
}
```

### Rate Limit Testing

When testing your integration:
- Use the provided test script to validate rate limiting behavior
- Send rapid-fire requests to trigger rate limits intentionally  
- Implement proper error handling for rate limit responses
- Test with concurrent requests using threading/async patterns

## Best Practices

1. **Authentication:** Always include the required API headers in requests
2. **Error Handling:** Implement proper error handling for all API calls
3. **Field Validation:** 
   - Ensure all required fields are present and not null
   - Don't send optional fields with null values - omit them instead
   - Validate field types and value ranges before sending requests
4. **Rate Limiting:** 
   - Respect the 100 microsecond rate limit per symbol
   - Implement exponential backoff for rate limit errors
   - Consider request batching to reduce API calls
5. **Trade Rules Compliance:**
   - Ensure orders meet the $1,000 USDT minimum size requirement
   - Wait at least 100 microseconds between price modifications
   - Monitor trade rule violation responses and adjust accordingly
6. **WebSocket Reconnection:** Implement automatic reconnection for WebSocket connections
7. **Order IDs:** Store and track order IDs for order management
8. **NBBO Protection:** Use NBBO protection for price-sensitive orders
9. **Min Fill Size:** Set appropriate minimum fill sizes for large orders
10. **Order Visibility:** Choose appropriate visibility (DARK/LIT) based on trading strategy
11. **Pegged Orders:** Use pegged order types for dynamic price adjustment and improved execution
12. **Error Response Handling:** Parse error codes and messages for specific issue identification
13. **Testing:** Use concurrent requests and edge cases to validate your error handling

## SDKs and Libraries

### Python Example

```python
import requests
import websocket
import json
import time

class GoDarkClient:
    def __init__(self, base_url, api_key, api_secret, api_passphrase, handshake_token):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': api_key,
            'X-API-SECRET': api_secret,
            'X-API-PASSPHRASE': api_passphrase,
            'Handshake-Token': handshake_token
        }
        self.last_request_time = {}  # Track rate limiting per symbol
    
    def _check_rate_limit(self, symbol):
        """Enforce 100 microsecond rate limit per symbol"""
        current_time = time.time()
        if symbol in self.last_request_time:
            time_diff = current_time - self.last_request_time[symbol]
            if time_diff < 0.0001:  # 100 microseconds
                time.sleep(0.0001 - time_diff)
        self.last_request_time[symbol] = time.time()
    
    def place_order(self, order_data):
        """
        Place an order with validation and rate limiting
        
        Required fields: symbol, side, price, quantity, time_in_force, execution_type, visibility
        Optional fields: min_fill_size, nbbo_protection, expiry_time
        """
        # Validate required fields
        required_fields = ['symbol', 'side', 'price', 'quantity', 'time_in_force', 'execution_type', 'visibility']
        for field in required_fields:
            if field not in order_data or order_data[field] is None:
                raise ValueError(f"Required field '{field}' is missing or null")
        
        # Validate minimum order size ($1,000 USDT)
        notional_value = order_data['price'] * order_data['quantity']
        if notional_value < 1000:
            raise ValueError(f"Order size ${notional_value:.2f} below minimum $1,000 USDT")
        
        # Apply rate limiting
        self._check_rate_limit(order_data['symbol'])
        
        url = f"{self.base_url}/place"
        response = requests.post(url, headers=self.headers, json=order_data)
        
        # Handle rate limiting errors
        if response.status_code == 429:
            print("Rate limited, retrying after delay...")
            time.sleep(0.001)  # 1ms backoff
            return self.place_order(order_data)
        
        return response.json()
    
    def cancel_order(self, order_id, symbol):
        self._check_rate_limit(symbol)
        url = f"{self.base_url}/cancel"
        data = {'order_id': order_id}
        response = requests.post(url, headers=self.headers, json=data)
        return response.json()
    
    def modify_order(self, order_id, symbol, price=None, quantity=None):
        self._check_rate_limit(symbol)
        url = f"{self.base_url}/modify"
        
        data = {'order_id': order_id}
        if price is not None:
            data['price'] = price
        if quantity is not None:
            data['quantity'] = quantity
            
        if not price and not quantity:
            raise ValueError("At least one of price or quantity must be provided")
            
        response = requests.post(url, headers=self.headers, json=data)
        return response.json()

# Usage with proper validation
client = GoDarkClient(
    'https://godark.goquant.io/testnet', 
    'your-api-key', 
    'your-secret', 
    'your-passphrase', 
    'your-handshake-token'
)

try:
    order_result = client.place_order({
        'symbol': 'BTC-USDT',
        'side': 'BUY',
        'price': 65000.0,
        'quantity': 0.02,  # $1,300 notional value
        'type': 'LIMIT',
        'time_in_force': 'GTC',
        'execution_type': 'STANDARD',
        'aon': False,
        'visibility': 'DARK',
        'min_fill_size': 0.01  # Optional field
        # Note: No null values sent for optional fields
    })
    print("Order placed:", order_result)
except ValueError as e:
    print("Validation error:", e)
```

### JavaScript Example

```javascript
class GoDarkClient {
    constructor(baseUrl, apiKey, apiSecret, apiPassphrase, handshakeToken) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
            'X-API-SECRET': apiSecret,
            'X-API-PASSPHRASE': apiPassphrase,
            'Handshake-Token': handshakeToken
        };
        this.lastRequestTime = new Map(); // Track rate limiting per symbol
    }
    
    async _checkRateLimit(symbol) {
        const currentTime = Date.now();
        if (this.lastRequestTime.has(symbol)) {
            const timeDiff = currentTime - this.lastRequestTime.get(symbol);
            if (timeDiff < 0.1) { // 0.1ms = 100 microseconds
                await new Promise(resolve => setTimeout(resolve, 0.1 - timeDiff));
            }
        }
        this.lastRequestTime.set(symbol, Date.now());
    }
    
    validateOrderData(orderData) {
        const requiredFields = ['symbol', 'side', 'price', 'quantity', 'time_in_force', 'execution_type', 'visibility'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in orderData) || orderData[field] === null || orderData[field] === undefined) {
                throw new Error(`Required field '${field}' is missing or null`);
            }
        }
        
        // Check minimum order size
        const notionalValue = orderData.price * orderData.quantity;
        if (notionalValue < 1000) {
            throw new Error(`Order size $${notionalValue.toFixed(2)} below minimum $1,000 USDT`);
        }
        
        // Remove null optional fields to avoid validation errors
        const cleanedData = { ...orderData };
        Object.keys(cleanedData).forEach(key => {
            if (cleanedData[key] === null || cleanedData[key] === undefined) {
                delete cleanedData[key];
            }
        });
        
        return cleanedData;
    }
    
    async placeOrder(orderData) {
        const validatedData = this.validateOrderData(orderData);
        await this._checkRateLimit(validatedData.symbol);
        
        const response = await fetch(`${this.baseUrl}/place`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(validatedData)
        });
        
        // Handle rate limiting
        if (response.status === 429) {
            console.log('Rate limited, retrying after delay...');
            await new Promise(resolve => setTimeout(resolve, 1)); // 1ms backoff
            return this.placeOrder(orderData);
        }
        
        const result = await response.json();
        
        // Check for validation errors
        if (result.code === 1401) {
            throw new Error(`Validation Error: ${result.data.message}`);
        }
        
        return result;
    }
    
    async cancelOrder(orderId, symbol) {
        await this._checkRateLimit(symbol);
        
        const response = await fetch(`${this.baseUrl}/cancel`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ order_id: orderId })
        });
        
        return await response.json();
    }
    
    async modifyOrder(orderId, symbol, { price, quantity } = {}) {
        if (!price && !quantity) {
            throw new Error('At least one of price or quantity must be provided');
        }
        
        await this._checkRateLimit(symbol);
        
        const data = { order_id: orderId };
        if (price !== undefined) data.price = price;
        if (quantity !== undefined) data.quantity = quantity;
        
        const response = await fetch(`${this.baseUrl}/modify`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        
        return await response.json();
    }
}

// Usage with proper validation and error handling
const client = new GoDarkClient(
    'https://godark.goquant.io/testnet',
    'your-api-key',
    'your-secret', 
    'your-passphrase',
    'your-handshake-token'
);

(async () => {
    try {
        const orderResult = await client.placeOrder({
            symbol: 'BTC-USDT',
            side: 'BUY',
            price: 65000.0,
            quantity: 0.02, // $1,300 notional value
            type: 'LIMIT',
            time_in_force: 'GTC',
            execution_type: 'STANDARD',
            aon: false,
            visibility: 'DARK',
            min_fill_size: 0.01 // Optional field
            // Note: No null values sent for optional fields
        });
        
        console.log('Order placed successfully:', orderResult);
        
    } catch (error) {
        console.error('Error placing order:', error.message);
    }
})();
```