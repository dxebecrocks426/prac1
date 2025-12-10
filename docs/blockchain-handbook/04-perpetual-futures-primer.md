# Perpetual Futures Primer for GoDark DEX

## Overview

GoDark DEX is a **perpetual futures exchange**. Understanding perpetual futures mechanics is essential for building and using the platform. This guide explains the core concepts, formulas, and mechanics specific to GoDark.

---

## What Are Perpetual Futures?

### Definition

**Perpetual futures** (perpetuals) are derivative contracts that:
- Have **no expiration date** (unlike traditional futures)
- Track the price of an underlying asset (e.g., BTC, ETH)
- Allow **long** (betting price goes up) or **short** (betting price goes down) positions
- Use **leverage** to amplify gains/losses
- Settle continuously through **funding rates**

### Perpetual Futures vs Traditional Futures

| Feature | Traditional Futures | Perpetual Futures |
|---------|---------------------|-------------------|
| **Expiration** | Fixed expiry date | No expiration |
| **Settlement** | Physical or cash at expiry | Continuous (funding rate) |
| **Margin** | Initial + maintenance | Initial + maintenance |
| **Leverage** | Typically 10-50x | Up to 1000x (GoDark) |

### Perpetual Futures vs Spot Trading

| Feature | Spot Trading | Perpetual Futures |
|---------|--------------|-------------------|
| **Ownership** | Own the asset | Contract, not asset |
| **Leverage** | None (or via lending) | Built-in leverage |
| **Short Selling** | Limited | Easy (just open short) |
| **Funding** | None | Hourly funding payments |

---

## Core Concepts

### 1. Long vs Short Positions

**Long Position:**
- Betting the price will **increase**
- Profit when price goes up
- Loss when price goes down
- Example: Open long at $50,000, close at $55,000 = +$5,000 profit

**Short Position:**
- Betting the price will **decrease**
- Profit when price goes down
- Loss when price goes up
- Example: Open short at $50,000, close at $45,000 = +$5,000 profit

### 2. Position Size

**Notional Value:**
```
Notional Value = Position Size × Entry Price
```

**Example:**
- Position Size: 1 BTC
- Entry Price: $50,000
- Notional Value: $50,000

### 3. Leverage

**Leverage** amplifies both gains and losses.

**Leverage Formula:**
```
Leverage = Notional Value / Collateral
```

**Example:**
- Collateral: $1,000 USDT
- Leverage: 10x
- Notional Value: $10,000
- Position Size: $10,000 / Entry Price

**GoDark Leverage Tiers:**
- 20x (conservative)
- 50x (moderate)
- 100x (aggressive)
- 500x (very aggressive)
- 1000x (maximum, high risk)

---

## Mark Price vs Index Price

### Mark Price

**Mark Price** is the price used for:
- PnL calculations
- Liquidation checks
- Funding rate calculations

**Mark Price Sources:**
- Oracle feeds (Pyth, Switchboard)
- Spot price from major exchanges
- Time-weighted average price (TWAP)

**Why Mark Price?**
- Prevents manipulation
- More stable than last trade price
- Fair liquidation pricing

### Index Price

**Index Price** is the underlying asset's spot price, typically:
- Average of multiple exchanges
- Weighted by volume
- Updated frequently

**GoDark Usage:**
- Mark Price: From oracle feeds (Pyth/Switchboard)
- Used for all position calculations
- Updated every second for funding rate

---

## Funding Rate Mechanics

### What is Funding Rate?

**Funding rate** is a periodic payment between long and short positions:
- **Positive funding rate**: Longs pay shorts (more longs than shorts)
- **Negative funding rate**: Shorts pay longs (more shorts than longs)
- **Purpose**: Keeps perpetual price aligned with spot price

### Funding Rate Calculation

**Premium Index:**
```
Premium Index = (Mark Price - Index Price) / Index Price
```

**Interest Rate:**
```
Interest Rate = (Interest Rate Long - Interest Rate Short) / 24
```

**Funding Rate:**
```
Funding Rate = Premium Index + Interest Rate
Funding Rate = Clamp(Funding Rate, -0.75%, +0.75%)  // Clamped
```

**GoDark Implementation:**
- Calculated every **1 second**
- Aggregated hourly
- Applied hourly to all open positions

### Funding Payment

**Payment Amount:**
```
Funding Payment = Position Size × Mark Price × Funding Rate
```

**Who Pays:**
- If funding rate > 0: Longs pay shorts
- If funding rate < 0: Shorts pay longs

**Example:**
- Position Size: 1 BTC
- Mark Price: $50,000
- Funding Rate: 0.01% (0.0001)
- Payment: 1 × $50,000 × 0.0001 = $5
- If long: Pay $5
- If short: Receive $5

**GoDark Frequency:**
- Payments occur **hourly**
- Accumulated from 3,600 one-second calculations

---

## Leverage and Margin

### Initial Margin

**Initial Margin** is the collateral required to open a position:

```
Initial Margin = Notional Value / Leverage
```

**Example:**
- Notional Value: $10,000
- Leverage: 10x
- Initial Margin: $10,000 / 10 = $1,000

**GoDark:**
- Minimum initial margin varies by leverage tier
- Higher leverage = higher initial margin requirement

### Maintenance Margin

**Maintenance Margin** is the minimum collateral to keep a position open:

```
Maintenance Margin = Notional Value × Maintenance Margin Rate
```

**Maintenance Margin Rate:**
- Typically 0.5% - 2% of notional value
- Varies by leverage tier
- Higher leverage = higher maintenance margin rate

**Example:**
- Notional Value: $10,000
- Maintenance Margin Rate: 1%
- Maintenance Margin: $10,000 × 0.01 = $100

### Margin Ratio

**Margin Ratio** indicates position health:

```
Margin Ratio = (Collateral + Unrealized PnL) / Maintenance Margin
```

**Interpretation:**
- Margin Ratio > 1.0: Position is safe
- Margin Ratio < 1.0: Position can be liquidated
- Margin Ratio < 0.5: Immediate liquidation risk

**GoDark Liquidation:**
- Liquidation triggered when Margin Ratio < 1.0
- Partial liquidation possible
- Full liquidation if Margin Ratio < 0.5

---

## PnL Calculation

### Unrealized PnL

**Unrealized PnL** is profit/loss on open positions:

**For Long Positions:**
```
Unrealized PnL = Position Size × (Mark Price - Entry Price)
```

**For Short Positions:**
```
Unrealized PnL = Position Size × (Entry Price - Mark Price)
```

**Example (Long):**
- Position Size: 1 BTC
- Entry Price: $50,000
- Mark Price: $55,000
- Unrealized PnL: 1 × ($55,000 - $50,000) = +$5,000

**Example (Short):**
- Position Size: 1 BTC
- Entry Price: $50,000
- Mark Price: $45,000
- Unrealized PnL: 1 × ($50,000 - $45,000) = +$5,000

### Realized PnL

**Realized PnL** is profit/loss when closing a position:

```
Realized PnL = Position Size × (Exit Price - Entry Price)  // Long
Realized PnL = Position Size × (Entry Price - Exit Price)   // Short
```

**Plus Funding Payments:**
```
Total Realized PnL = Realized PnL + Cumulative Funding Payments
```

### Total Equity

**Total Equity** is your account value:

```
Total Equity = Collateral + Unrealized PnL - Unrealized Funding
```

**GoDark Display:**
- Real-time unrealized PnL
- Cumulative funding payments
- Total equity

---

## Liquidation Mechanics

### Liquidation Price

**Liquidation Price** is when a position gets liquidated:

**For Long Positions:**
```
Liquidation Price = Entry Price × (1 - Initial Margin Rate / Maintenance Margin Rate)
```

**For Short Positions:**
```
Liquidation Price = Entry Price × (1 + Initial Margin Rate / Maintenance Margin Rate)
```

**Example (Long, 10x leverage):**
- Entry Price: $50,000
- Initial Margin Rate: 10% (1/leverage)
- Maintenance Margin Rate: 1%
- Liquidation Price: $50,000 × (1 - 0.10 / 0.01) = $45,000

### Partial vs Full Liquidation

**Partial Liquidation:**
- Occurs when Margin Ratio < 1.0 but > 0.5
- Liquidates enough to restore Margin Ratio to 1.0
- Remaining position stays open

**Full Liquidation:**
- Occurs when Margin Ratio < 0.5
- Entire position liquidated
- Remaining collateral returned (if any)

### Liquidation Process

1. **Detection**: Liquidation engine monitors positions
2. **Eligibility Check**: Margin Ratio < 1.0
3. **Execution**: Liquidator executes liquidation
4. **Reward**: Liquidator receives fee (e.g., 5% of position value)
5. **Bad Debt**: If insufficient, insurance fund covers

**GoDark Implementation:**
- Real-time monitoring (100ms intervals)
- Automatic liquidation execution
- Liquidator rewards incentivize participation

---

## Insurance Fund and Bad Debt

### Insurance Fund

**Purpose**: Covers bad debt from liquidations

**Bad Debt Scenarios:**
- Position liquidated at worse price than expected
- Slippage during liquidation
- Market gaps (flash crashes)

**Insurance Fund Sources:**
- Portion of trading fees
- Liquidation penalties
- Protocol reserves

**GoDark:**
- Insurance fund managed on-chain
- Transparent and auditable
- Covers bad debt automatically

### Bad Debt Handling

**If Bad Debt Occurs:**
1. Insurance fund covers the loss
2. If insurance fund insufficient: Protocol may pause
3. Emergency procedures activated

**Prevention:**
- Proper liquidation incentives
- Adequate insurance fund size
- Risk management parameters

---

## Dark Pool Advantages for Perpetuals

### Privacy Benefits

**Order Hiding:**
- Large orders don't move market
- No front-running
- Reduced market impact

**GoDark Dark Pool:**
- Orders invisible until execution
- Price-time priority matching
- Institutional-grade privacy

### Execution Quality

**Large Block Trades:**
- Execute large positions without slippage
- Better fill prices
- Reduced market impact

**Market Makers:**
- Provide liquidity anonymously
- Better spreads
- Reduced adverse selection

---

## Funding Rate Payment Flow

### Calculation Loop

```
Every 1 Second:
1. Fetch Mark Price from oracle
2. Fetch Index Price from oracle
3. Calculate Premium Index
4. Calculate Interest Rate
5. Calculate Funding Rate
6. Store sample

Every Hour:
1. Aggregate 3,600 samples
2. Calculate average Funding Rate
3. Apply to all open positions
4. Transfer payments (longs ↔ shorts)
5. Record in history
```

### Payment Distribution

**For Each Position:**
1. Calculate payment amount
2. Deduct from long positions (if funding > 0)
3. Credit to short positions (if funding > 0)
4. Update position collateral
5. Emit event

**GoDark Implementation:**
- Hourly payment distribution
- Batch processing for efficiency
- On-chain settlement

---

## Position Lifecycle

### 1. Open Position

```
User → Deposit Collateral → Select Leverage → Open Position
```

**Steps:**
1. Deposit USDT to collateral vault
2. Select leverage tier (20x - 1000x)
3. Choose long or short
4. Specify position size
5. Position created on-chain

### 2. Modify Position

**Actions:**
- **Add Collateral**: Increase margin
- **Remove Collateral**: Decrease margin (if safe)
- **Increase Size**: Add to position
- **Decrease Size**: Partial close

**Constraints:**
- Must maintain maintenance margin
- Cannot remove collateral if Margin Ratio < 1.5

### 3. Close Position

**Full Close:**
- Close entire position
- Realize PnL
- Return remaining collateral
- Deduct funding payments

**Partial Close:**
- Reduce position size
- Realize PnL on closed portion
- Remaining position stays open

### 4. Liquidation

**Automatic:**
- Triggered by liquidation engine
- Liquidator executes
- Position closed
- Remaining collateral returned (if any)

---

## Key Formulas Reference

### Position Metrics

```
Notional Value = Position Size × Mark Price
Leverage = Notional Value / Collateral
Margin Ratio = (Collateral + Unrealized PnL) / Maintenance Margin
```

### PnL Calculations

```
Unrealized PnL (Long) = Position Size × (Mark Price - Entry Price)
Unrealized PnL (Short) = Position Size × (Entry Price - Mark Price)
Realized PnL = Position Size × (Exit Price - Entry Price) + Funding Payments
```

### Funding Rate

```
Premium Index = (Mark Price - Index Price) / Index Price
Funding Rate = Premium Index + Interest Rate
Funding Payment = Position Size × Mark Price × Funding Rate
```

### Liquidation

```
Liquidation Price (Long) = Entry Price × (1 - Initial Margin / Maintenance Margin)
Liquidation Price (Short) = Entry Price × (1 + Initial Margin / Maintenance Margin)
```

---

## Key Takeaways

1. **Perpetual futures have no expiration** - Unlike traditional futures
2. **Funding rate keeps price aligned** - Longs and shorts pay each other
3. **Leverage amplifies risk** - Higher leverage = higher risk
4. **Margin ratio determines safety** - < 1.0 = liquidation risk
5. **Mark price prevents manipulation** - Uses oracle feeds, not last trade
6. **Dark pool provides privacy** - Large orders don't move market
7. **Insurance fund covers bad debt** - Protects protocol solvency

---

## Next Steps

- Review **[05-component-overview.md](./05-component-overview.md)** to see how these concepts are implemented
- Study **[03-solana-fundamentals.md](./03-solana-fundamentals.md)** for Solana-specific implementation details
- Check component assignments for implementation details

---

**Last Updated:** January 2025

