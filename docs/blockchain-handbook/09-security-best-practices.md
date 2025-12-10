# Security Best Practices for GoDark DEX

## Overview

Security is paramount for financial applications handling user funds. This guide covers security best practices, attack vectors, and defensive patterns for GoDark DEX development.

---

## Solana Security Model

### Authority and Ownership

**Key Concepts:**
- **Owner**: Program that controls an account
- **Authority**: Entity that can modify an account
- **Signer**: Account that must sign a transaction

**Security Principle:**
- Only the owner program can modify account data
- Authority checks must be explicit
- Signers prove identity

### Account Ownership Validation

**Always Verify Ownership:**
```rust
pub fn modify_account(ctx: Context<ModifyAccount>) -> Result<()> {
    // Verify account is owned by this program
    require!(
        ctx.accounts.account.owner == ctx.program_id,
        ErrorCode::InvalidAccountOwner
    );
    
    // Verify authority
    require!(
        ctx.accounts.authority.key() == &ctx.accounts.account.authority,
        ErrorCode::Unauthorized
    );
    
    // Now safe to modify
    ctx.accounts.account.data = new_data;
    Ok(())
}
```

---

## Input Validation Patterns

### Validate All Inputs

**Size Validation:**
```rust
pub fn open_position(ctx: Context<OpenPosition>, size: u64, leverage: u8) -> Result<()> {
    // Validate size
    require!(size > 0, ErrorCode::InvalidSize);
    require!(size <= MAX_POSITION_SIZE, ErrorCode::SizeTooLarge);
    
    // Validate leverage
    require!(leverage >= 1, ErrorCode::InvalidLeverage);
    require!(leverage <= 1000, ErrorCode::LeverageTooHigh);
    
    // Validate leverage tier
    require!(
        is_valid_leverage_tier(leverage),
        ErrorCode::InvalidLeverageTier
    );
    
    // ... rest of logic
    Ok(())
}
```

### Type Validation

**Validate Account Types:**
```rust
#[account(
    constraint = token_account.owner == token::ID @ ErrorCode::InvalidTokenAccount,
    constraint = token_account.mint == expected_mint @ ErrorCode::InvalidMint,
)]
pub token_account: Account<'info, TokenAccount>,
```

### Range Validation

**Validate Numeric Ranges:**
```rust
pub fn set_funding_rate(ctx: Context<SetFundingRate>, rate: i64) -> Result<()> {
    const MIN_RATE: i64 = -7500; // -0.75% (in basis points)
    const MAX_RATE: i64 = 7500;  // +0.75%
    
    require!(
        rate >= MIN_RATE && rate <= MAX_RATE,
        ErrorCode::FundingRateOutOfRange
    );
    
    ctx.accounts.config.funding_rate = rate;
    Ok(())
}
```

---

## Authority Checks

### Who Can Call What?

**Pattern: Explicit Authority Checks**
```rust
pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
    // Check 1: Must be position owner
    require!(
        ctx.accounts.authority.key() == &ctx.accounts.position.user,
        ErrorCode::Unauthorized
    );
    
    // Check 2: Position must be open
    require!(
        ctx.accounts.position.status == PositionStatus::Open,
        ErrorCode::PositionNotOpen
    );
    
    // Safe to close
    ctx.accounts.position.close()?;
    Ok(())
}
```

### PDA Authority Pattern

**Verify PDA Signer:**
```rust
pub fn transfer_from_vault(ctx: Context<TransferFromVault>, amount: u64) -> Result<()> {
    // Derive expected PDA
    let (expected_vault, bump) = Pubkey::find_program_address(
        &[b"vault", ctx.accounts.user.key().as_ref()],
        ctx.program_id,
    );
    
    // Verify PDA matches
    require!(
        ctx.accounts.vault.key() == &expected_vault,
        ErrorCode::InvalidVault
    );
    
    // Sign with PDA
    let seeds = &[
        b"vault",
        ctx.accounts.user.key().as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];
    
    // Execute CPI with PDA signature
    transfer_tokens_cpi(ctx, amount, signer)?;
    Ok(())
}
```

### Multisig Authority Pattern

**Verify Multisig Approval:**
```rust
pub fn execute_upgrade(ctx: Context<ExecuteUpgrade>) -> Result<()> {
    let proposal = &ctx.accounts.proposal;
    
    // Check approval threshold met
    require!(
        proposal.approvals.len() >= proposal.threshold as usize,
        ErrorCode::InsufficientApprovals
    );
    
    // Verify all approvers are multisig members
    let multisig = &ctx.accounts.multisig;
    for approver in proposal.approvals.iter() {
        require!(
            multisig.members.contains(approver),
            ErrorCode::InvalidApprover
        );
    }
    
    // Execute upgrade
    execute_upgrade_cpi(ctx)?;
    Ok(())
}
```

---

## Reentrancy Prevention

### Checks-Effects-Interactions Pattern

**Order of Operations:**
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // 1. CHECKS: Validate inputs and state
    require!(
        ctx.accounts.vault.balance >= amount,
        ErrorCode::InsufficientBalance
    );
    require!(
        ctx.accounts.authority.key() == &ctx.accounts.vault.authority,
        ErrorCode::Unauthorized
    );
    
    // 2. EFFECTS: Update state FIRST
    ctx.accounts.vault.balance -= amount;
    ctx.accounts.vault.last_withdrawal = Clock::get()?.unix_timestamp;
    
    // 3. INTERACTIONS: External calls LAST
    transfer_tokens_cpi(ctx, amount)?;
    
    Ok(())
}
```

### State Locks

**Prevent Concurrent Modifications:**
```rust
#[account]
pub struct Position {
    pub locked: bool,        // Lock flag
    pub user: Pubkey,
    // ... other fields
}

pub fn modify_position(ctx: Context<ModifyPosition>) -> Result<()> {
    // Check lock
    require!(
        !ctx.accounts.position.locked,
        ErrorCode::PositionLocked
    );
    
    // Set lock
    ctx.accounts.position.locked = true;
    
    // Perform modification
    ctx.accounts.position.size = new_size;
    
    // Release lock
    ctx.accounts.position.locked = false;
    
    Ok(())
}
```

---

## Integer Arithmetic Safety

### Use Checked Math

**Always Use Checked Operations:**
```rust
// WRONG: Potential overflow
pub fn add_collateral(ctx: Context<AddCollateral>, amount: u64) -> Result<()> {
    ctx.accounts.position.collateral += amount; // May overflow!
    Ok(())
}

// CORRECT: Checked arithmetic
pub fn add_collateral(ctx: Context<AddCollateral>, amount: u64) -> Result<()> {
    ctx.accounts.position.collateral = ctx.accounts.position.collateral
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    Ok(())
}
```

### Fixed-Point Arithmetic

**For Financial Calculations:**
```rust
// Use fixed-point math for precision
pub fn calculate_funding_payment(
    position_size: u64,
    mark_price: u64,
    funding_rate: i64, // In basis points (e.g., 100 = 0.01%)
) -> Result<i64> {
    // Multiply first to maintain precision
    let payment = (position_size as u128)
        .checked_mul(mark_price as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(funding_rate.abs() as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(1_000_000) // Divide by 100 * 10000 (basis points * price precision)
        .ok_or(ErrorCode::DivisionByZero)?;
    
    Ok(if funding_rate < 0 {
        -(payment as i64)
    } else {
        payment as i64
    })
}
```

---

## Account Validation

### Ownership Validation

**Verify Account Ownership:**
```rust
#[account(
    owner = program_id @ ErrorCode::InvalidAccountOwner
)]
pub account: Account<'info, State>,
```

### Data Format Validation

**Verify Account Data Structure:**
```rust
pub fn validate_account(account: &AccountInfo) -> Result<()> {
    // Check account is initialized
    require!(
        account.data_len() >= 8, // At least discriminator
        ErrorCode::AccountNotInitialized
    );
    
    // Check discriminator matches
    let discriminator = &account.data.borrow()[..8];
    require!(
        discriminator == State::DISCRIMINATOR,
        ErrorCode::InvalidAccountDiscriminator
    );
    
    Ok(())
}
```

### State Validation

**Verify Account State:**
```rust
pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
    let position = &ctx.accounts.position;
    
    // Check position is open
    require!(
        position.status == PositionStatus::Open,
        ErrorCode::PositionNotOpen
    );
    
    // Check no pending operations
    require!(
        !position.locked,
        ErrorCode::PositionLocked
    );
    
    // Safe to close
    position.close()?;
    Ok(())
}
```

---

## Oracle Manipulation Prevention

### Price Validation

**Validate Oracle Prices:**
```rust
pub fn validate_price(price_data: &PriceData) -> Result<()> {
    let clock = Clock::get()?;
    
    // Check staleness (max 60 seconds old)
    let max_age = 60;
    require!(
        clock.unix_timestamp - price_data.timestamp < max_age,
        ErrorCode::StalePrice
    );
    
    // Check confidence (must be < 1% of price)
    let confidence_threshold = price_data.price
        .checked_div(100)
        .ok_or(ErrorCode::DivisionByZero)?;
    
    require!(
        price_data.confidence < confidence_threshold,
        ErrorCode::LowConfidence
    );
    
    // Check price is reasonable (not zero, not extreme)
    require!(price_data.price > 0, ErrorCode::InvalidPrice);
    require!(
        price_data.price < MAX_REASONABLE_PRICE,
        ErrorCode::PriceTooHigh
    );
    
    Ok(())
}
```

### Multi-Oracle Consensus

**Use Multiple Oracles:**
```rust
pub fn get_consensus_price(
    pyth_price: &PriceData,
    switchboard_price: &PriceData,
) -> Result<u64> {
    // Validate both prices
    validate_price(pyth_price)?;
    validate_price(switchboard_price)?;
    
    // Calculate median
    let prices = vec![pyth_price.price, switchboard_price.price];
    prices.sort();
    let median = prices[prices.len() / 2];
    
    // Check prices are within acceptable range (5%)
    let price_diff = if pyth_price.price > switchboard_price.price {
        pyth_price.price - switchboard_price.price
    } else {
        switchboard_price.price - pyth_price.price
    };
    
    let max_diff = median.checked_div(20).ok_or(ErrorCode::DivisionByZero)?; // 5%
    require!(
        price_diff < max_diff,
        ErrorCode::PriceDeviationTooHigh
    );
    
    Ok(median)
}
```

---

## Economic Attack Vectors

### Liquidation Manipulation

**Attack:** Manipulate mark price to trigger unfair liquidations.

**Defense:**
```rust
pub fn liquidate_position(ctx: Context<LiquidatePosition>) -> Result<()> {
    // Use time-weighted average price (TWAP) for liquidation
    let twap_price = calculate_twap(&ctx.accounts.price_history)?;
    
    // Verify mark price is close to TWAP (within 2%)
    let price_diff = if mark_price > twap_price {
        mark_price - twap_price
    } else {
        twap_price - mark_price
    };
    
    let max_diff = twap_price.checked_div(50).ok_or(ErrorCode::DivisionByZero)?; // 2%
    require!(
        price_diff < max_diff,
        ErrorCode::PriceManipulationDetected
    );
    
    // Proceed with liquidation
    execute_liquidation(ctx, twap_price)?;
    Ok(())
}
```

### Funding Rate Attacks

**Attack:** Manipulate funding rate to extract value.

**Defense:**
```rust
pub fn calculate_funding_rate(
    mark_price: u64,
    index_price: u64,
) -> Result<i64> {
    // Clamp funding rate to prevent extreme values
    const MIN_RATE: i64 = -7500; // -0.75%
    const MAX_RATE: i64 = 7500;  // +0.75%
    
    let premium_index = calculate_premium_index(mark_price, index_price)?;
    let interest_rate = get_interest_rate()?;
    
    let funding_rate = premium_index + interest_rate;
    
    // Clamp to prevent manipulation
    let clamped_rate = funding_rate.max(MIN_RATE).min(MAX_RATE);
    
    Ok(clamped_rate)
}
```

### Front-Running Prevention

**Attack:** Front-run large orders.

**Defense:**
- Dark pool hides orders until execution
- Batch settlement prevents front-running
- Merkle tree verification ensures trade integrity

---

## Access Control Patterns

### Role-Based Access

**Implement Roles:**
```rust
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub operators: Vec<Pubkey>,
    pub emergency_pause_authority: Pubkey,
}

pub fn admin_only_operation(ctx: Context<AdminOperation>) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == &ctx.accounts.config.admin,
        ErrorCode::AdminOnly
    );
    // ... operation
    Ok(())
}
```

### Time-Based Access

**Implement Timelocks:**
```rust
pub fn execute_upgrade(ctx: Context<ExecuteUpgrade>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &ctx.accounts.proposal;
    
    // Check timelock expired
    require!(
        clock.unix_timestamp >= proposal.timelock_until,
        ErrorCode::TimelockNotExpired
    );
    
    // Execute upgrade
    execute_upgrade_cpi(ctx)?;
    Ok(())
}
```

---

## Secure Key Management

### Never Hardcode Keys

**Wrong:**
```rust
const ADMIN_KEY: &str = "Admin111111111111111111111111111111111"; // DON'T DO THIS!
```

**Correct:**
```rust
// Use environment variables or on-chain config
pub fn get_admin(ctx: Context<GetAdmin>) -> Result<Pubkey> {
    Ok(ctx.accounts.config.admin)
}
```

### Keypair Security

**For Backend Services:**
- Store keypairs encrypted
- Use environment variables for keys
- Rotate keys regularly
- Never commit keys to git

**Example:**
```rust
use solana_sdk::signature::read_keypair_file;

// Load from environment variable path
let keypair_path = std::env::var("KEYPAIR_PATH")
    .expect("KEYPAIR_PATH not set");
let keypair = read_keypair_file(&keypair_path)
    .map_err(|e| anyhow::anyhow!("Failed to read keypair: {}", e))?;
```

---

## Audit Preparation Checklist

### Code Review Checklist

- [ ] All inputs validated
- [ ] Authority checks present
- [ ] Integer overflow protection
- [ ] Account ownership verified
- [ ] Error handling comprehensive
- [ ] Oracle manipulation prevention
- [ ] Economic attack vectors considered
- [ ] Key management secure
- [ ] Documentation complete

### Security Audit Points

**Critical Areas:**
1. **Liquidation Engine**
   - Manipulation resistance
   - Fair liquidation pricing
   - Bad debt handling

2. **Funding Rate**
   - Oracle manipulation prevention
   - Rate clamping
   - Payment distribution security

3. **Settlement**
   - Merkle tree verification
   - Batch integrity
   - Replay attack prevention

4. **Vault Management**
   - Authorization checks
   - Withdrawal limits
   - Balance reconciliation

5. **Position Management**
   - Margin calculations
   - PnL accuracy
   - State consistency

---

## Security Review Process

### Pre-Deployment Checklist

1. **Code Review**
   - Peer review completed
   - Security review completed
   - All feedback addressed

2. **Testing**
   - Unit tests passing
   - Integration tests passing
   - Security tests passing
   - Edge cases tested

3. **Documentation**
   - Security assumptions documented
   - Attack vectors documented
   - Mitigation strategies documented

4. **Audit**
   - Internal audit completed
   - External audit (if applicable)
   - Findings addressed

### Post-Deployment Monitoring

- Monitor for unusual activity
- Track security metrics
- Review logs regularly
- Update security measures

---

## Key Takeaways

1. **Validate Everything**: All inputs, accounts, states
2. **Check Authority**: Always verify who can do what
3. **Use Checked Math**: Prevent overflow/underflow
4. **Prevent Manipulation**: Oracle validation, rate clamping
5. **Secure Keys**: Never hardcode, use environment variables
6. **Audit Ready**: Document security assumptions
7. **Monitor**: Watch for attacks post-deployment

---

## Next Steps

- Review **[08-common-patterns-pitfalls.md](./08-common-patterns-pitfalls.md)** for implementation patterns
- Study security audit reports from other DeFi protocols
- Practice identifying attack vectors in your component

---

**Last Updated:** January 2025

