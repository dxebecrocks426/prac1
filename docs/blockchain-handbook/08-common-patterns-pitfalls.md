# Common Patterns and Pitfalls in Solana/Anchor Development

## Overview

This guide covers common patterns used in GoDark DEX development and pitfalls to avoid. Learning these patterns will help you write better, more secure Solana programs.

---

## Common Patterns

### Pattern 1: PDA Derivation and Management

**Use Case:** Creating deterministic addresses for user-specific or global state accounts.

**Implementation:**
```rust
use anchor_lang::prelude::*;

// Derive PDA
let (pda, bump) = Pubkey::find_program_address(
    &[
        b"position",              // Seed 1: account type
        user_pubkey.as_ref(),     // Seed 2: user identifier
    ],
    program_id,
);

// Verify PDA in instruction
#[account(
    seeds = [b"position", user.key().as_ref()],
    bump
)]
pub position: Account<'info, Position>,
```

**GoDark Examples:**
- Position accounts: `[b"position", user_pubkey]`
- Vault accounts: `[b"vault", user_pubkey, mint_pubkey]`
- Config accounts: `[b"config"]`

**Best Practices:**
- Use constants for seeds: `const SEED_POSITION: &[u8] = b"position";`
- Include bump in seeds for signing
- Document seed order in comments

---

### Pattern 2: Authority Transfer Patterns

**Use Case:** Transferring control of accounts or programs.

**Implementation:**
```rust
// Transfer authority to PDA
pub fn transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
    let new_authority = &ctx.accounts.new_authority;
    
    // Update authority
    ctx.accounts.account.authority = *new_authority.key;
    
    Ok(())
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(mut)]
    pub account: Account<'info, State>,
    pub current_authority: Signer<'info>,
    /// CHECK: New authority (can be PDA)
    pub new_authority: UncheckedAccount<'info>,
}
```

**GoDark Usage:**
- Program upgrade authority → Multisig PDA
- Vault authority → Program PDA
- Position authority → User (immutable)

---

### Pattern 3: Account Initialization

**Use Case:** Creating new accounts with proper space and rent.

**Implementation:**
```rust
#[account(init, payer = user, space = 8 + Position::LEN)]
pub position: Account<'info, Position>,

#[account]
pub struct Position {
    pub user: Pubkey,
    pub size: u64,
    pub leverage: u8,
    // ... other fields
}

impl Position {
    pub const LEN: usize = 32 + 8 + 1; // user + size + leverage
}
```

**Space Calculation:**
```rust
// Discriminator: 8 bytes
// Data fields:
// - Pubkey: 32 bytes
// - u64: 8 bytes
// - u8: 1 byte
// Total: 8 + 32 + 8 + 1 = 49 bytes
```

**GoDark Pattern:**
- Always calculate space accurately
- Use constants for size: `pub const LEN: usize = ...`
- Include discriminator (8 bytes) in calculation

---

### Pattern 4: CPI Patterns

**Use Case:** Calling other programs (SPL Token, other Solana programs).

**Token Transfer CPI:**
```rust
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

**CPI with PDA Signing:**
```rust
pub fn transfer_from_vault(ctx: Context<TransferFromVault>, amount: u64) -> Result<()> {
    let seeds = &[
        b"vault",
        ctx.accounts.user.key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token.to_account_info(),
        to: ctx.accounts.user_token.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

**GoDark Usage:**
- Collateral vault → SPL Token transfers
- Position management → Lock/unlock collateral
- Settlement → Batch token operations

---

### Pattern 5: State Migration Patterns

**Use Case:** Upgrading programs while preserving account data.

**Implementation:**
```rust
#[account]
pub struct Position {
    pub version: u32,        // Version field
    pub user: Pubkey,
    pub size: u64,
    // ... other fields
}

pub fn migrate_position(ctx: Context<MigratePosition>) -> Result<()> {
    let position = &mut ctx.accounts.position;
    
    // Check version
    require!(
        position.version < CURRENT_VERSION,
        ErrorCode::AlreadyMigrated
    );
    
    // Migrate data
    if position.version == 1 {
        // Transform from v1 to v2
        position.new_field = calculate_new_field(position);
    }
    
    position.version = CURRENT_VERSION;
    Ok(())
}
```

**GoDark Usage:**
- Program upgrade system handles migrations
- Account versioning for compatibility
- Data transformation between versions

---

### Pattern 6: Error Handling Strategies

**Use Case:** Providing clear, actionable error messages.

**Implementation:**
```rust
use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient collateral. Required: {required}, Available: {available}")]
    InsufficientCollateral {
        required: u64,
        available: u64,
    },
    #[msg("Invalid leverage tier: {leverage}. Must be 1-1000")]
    InvalidLeverage { leverage: u8 },
    #[msg("Position not found")]
    PositionNotFound,
}

// Usage
require!(
    collateral >= required,
    ErrorCode::InsufficientCollateral {
        required,
        available: collateral
    }
);
```

**Best Practices:**
- Use descriptive error messages
- Include relevant context (values, constraints)
- Use error codes for programmatic handling
- Document error conditions

---

### Pattern 7: Event Emission Patterns

**Use Case:** Notifying off-chain systems of on-chain events.

**Implementation:**
```rust
use anchor_lang::prelude::*;

#[event]
pub struct PositionOpened {
    pub user: Pubkey,
    pub position_id: Pubkey,
    pub size: u64,
    pub leverage: u8,
    pub entry_price: u64,
    pub timestamp: i64,
}

pub fn open_position(ctx: Context<OpenPosition>, size: u64, leverage: u8) -> Result<()> {
    // ... open position logic ...
    
    emit!(PositionOpened {
        user: ctx.accounts.user.key(),
        position_id: ctx.accounts.position.key(),
        size,
        leverage,
        entry_price: mark_price,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

**GoDark Usage:**
- Position events (open, close, modify)
- Liquidation events
- Funding rate payments
- Upgrade events

---

## Common Pitfalls

### Pitfall 1: Account Ownership Mistakes

**Problem:** Trying to modify account owned by wrong program.

**Example (Wrong):**
```rust
pub fn modify_account(ctx: Context<ModifyAccount>) -> Result<()> {
    // This will fail if account is owned by different program
    ctx.accounts.account.data = new_data;
    Ok(())
}
```

**Solution:**
```rust
pub fn modify_account(ctx: Context<ModifyAccount>) -> Result<()> {
    // Verify ownership
    require!(
        ctx.accounts.account.owner == ctx.program_id,
        ErrorCode::InvalidAccountOwner
    );
    
    ctx.accounts.account.data = new_data;
    Ok(())
}

// Or use Anchor's account constraint
#[account(
    owner = program_id @ ErrorCode::InvalidAccountOwner
)]
pub account: Account<'info, State>,
```

---

### Pitfall 2: PDA Seed Mismatches

**Problem:** PDA derivation fails due to incorrect seeds.

**Example (Wrong):**
```rust
// In instruction handler
let (pda, bump) = Pubkey::find_program_address(
    &[b"vault", user_pubkey.as_ref()],
    program_id,
);

// But in account constraint
#[account(
    seeds = [b"vault", mint_pubkey.as_ref()], // Different seeds!
    bump
)]
pub vault: Account<'info, Vault>,
```

**Solution:**
```rust
// Use constants
const SEED_VAULT: &[u8] = b"vault";

// Derive PDA
let (pda, bump) = Pubkey::find_program_address(
    &[SEED_VAULT, user_pubkey.as_ref()],
    program_id,
);

// Use same seeds in constraint
#[account(
    seeds = [SEED_VAULT, user.key().as_ref()],
    bump
)]
pub vault: Account<'info, Vault>,
```

---

### Pitfall 3: Rent-Exempt Account Requirements

**Problem:** Account not rent-exempt, gets closed by runtime.

**Example (Wrong):**
```rust
#[account(init, payer = user, space = 8 + 32)]
pub account: Account<'info, State>,
// Missing rent-exempt check
```

**Solution:**
```rust
#[account(
    init,
    payer = user,
    space = 8 + State::LEN
)]
pub account: Account<'info, State>,

// Anchor automatically ensures rent-exempt for init accounts
// For existing accounts, verify:
require!(
    account.to_account_info().lamports() >= Rent::get()?.minimum_balance(space),
    ErrorCode::InsufficientBalance
);
```

---

### Pitfall 4: Compute Unit Exhaustion

**Problem:** Transaction fails due to compute limit exceeded.

**Example (Wrong):**
```rust
pub fn process_many(ctx: Context<ProcessMany>, items: Vec<Item>) -> Result<()> {
    for item in items.iter() {
        // Expensive operation in loop
        process_item(item)?; // May exceed compute budget
    }
    Ok(())
}
```

**Solution:**
```rust
// Option 1: Set higher compute budget
use solana_program::compute_budget::ComputeBudgetInstruction;

let compute_budget = ComputeBudgetInstruction::set_compute_unit_limit(400_000);
instructions.push(compute_budget);

// Option 2: Optimize algorithm
pub fn process_many(ctx: Context<ProcessMany>, items: Vec<Item>) -> Result<()> {
    // Batch process or use more efficient algorithm
    let results: Vec<_> = items.iter()
        .map(|item| process_item_optimized(item))
        .collect();
    Ok(())
}
```

---

### Pitfall 5: Transaction Size Limits

**Problem:** Transaction exceeds 1,232 byte limit.

**Example (Wrong):**
```rust
pub fn batch_settle(ctx: Context<BatchSettle>, trades: Vec<Trade>) -> Result<()> {
    // Too many trades in one transaction
    for trade in trades.iter() {
        settle_trade(ctx, trade)?;
    }
    Ok(())
}
```

**Solution:**
```rust
// Split into multiple transactions
pub fn batch_settle(ctx: Context<BatchSettle>, trades: Vec<Trade>) -> Result<()> {
    const MAX_TRADES_PER_TX: usize = 20; // Adjust based on trade size
    
    for chunk in trades.chunks(MAX_TRADES_PER_TX) {
        settle_chunk(ctx, chunk)?;
    }
    Ok(())
}
```

---

### Pitfall 6: Reentrancy Concerns

**Problem:** While Solana programs are single-threaded, CPI reentrancy can cause issues.

**Example (Wrong):**
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Update balance first
    ctx.accounts.vault.balance -= amount;
    
    // Then transfer (CPI could call back)
    transfer_tokens(ctx, amount)?; // Potential reentrancy
    Ok(())
}
```

**Solution:**
```rust
// Use checks-effects-interactions pattern
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // 1. Checks
    require!(
        ctx.accounts.vault.balance >= amount,
        ErrorCode::InsufficientBalance
    );
    
    // 2. Effects (update state first)
    ctx.accounts.vault.balance -= amount;
    
    // 3. Interactions (external calls last)
    transfer_tokens(ctx, amount)?;
    
    Ok(())
}
```

---

### Pitfall 7: Integer Overflow/Underflow

**Problem:** Arithmetic operations overflow without checks.

**Example (Wrong):**
```rust
pub fn add_collateral(ctx: Context<AddCollateral>, amount: u64) -> Result<()> {
    // Potential overflow
    ctx.accounts.position.collateral += amount;
    Ok(())
}
```

**Solution:**
```rust
pub fn add_collateral(ctx: Context<AddCollateral>, amount: u64) -> Result<()> {
    // Use checked arithmetic
    ctx.accounts.position.collateral = ctx.accounts.position.collateral
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    Ok(())
}

// Or use Anchor's checked math
use anchor_lang::solana_program::program_error::ProgramError;

let new_balance = ctx.accounts.position.collateral
    .checked_add(amount)
    .ok_or(ProgramError::ArithmeticOverflow)?;
```

---

### Pitfall 8: Missing Authority Checks

**Problem:** Anyone can call restricted instruction.

**Example (Wrong):**
```rust
pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
    // Missing authority check!
    ctx.accounts.position.close()?;
    Ok(())
}
```

**Solution:**
```rust
pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
    // Check authority
    require!(
        ctx.accounts.authority.key() == &ctx.accounts.position.user,
        ErrorCode::Unauthorized
    );
    
    ctx.accounts.position.close()?;
    Ok(())
}

// Or use Anchor's Signer constraint
#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(
        mut,
        close = authority, // Closes account and returns rent
        has_one = user @ ErrorCode::Unauthorized
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub authority: Signer<'info>,
}
```

---

### Pitfall 9: Incorrect Account Ordering

**Problem:** Accounts not ordered correctly (writable first).

**Example (Wrong):**
```rust
#[derive(Accounts)]
pub struct Example<'info> {
    pub read_only: Account<'info, State>,      // Read-only first
    #[account(mut)]
    pub writable: Account<'info, State>,       // Writable second
}
```

**Solution:**
```rust
#[derive(Accounts)]
pub struct Example<'info> {
    #[account(mut)]                            // Writable first
    pub writable: Account<'info, State>,
    pub read_only: Account<'info, State>,       // Read-only second
}
```

**Best Practice:** Order accounts as:
1. Writable accounts (mut)
2. Read-only accounts
3. Signers
4. Programs

---

### Pitfall 10: Stale Account Data

**Problem:** Using account data that may have changed.

**Example (Wrong):**
```rust
pub fn process(ctx: Context<Process>) -> Result<()> {
    let balance = ctx.accounts.account.balance; // Read balance
    
    // ... do other operations ...
    
    // Balance may have changed!
    ctx.accounts.account.balance = balance + amount;
    Ok(())
}
```

**Solution:**
```rust
pub fn process(ctx: Context<Process>) -> Result<()> {
    // Read and use immediately
    let current_balance = ctx.accounts.account.balance;
    ctx.accounts.account.balance = current_balance
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    Ok(())
}
```

---

## GoDark-Specific Patterns

### Pattern: Batch Settlement

**Implementation:**
```rust
pub fn batch_settle(ctx: Context<BatchSettle>, merkle_root: [u8; 32]) -> Result<()> {
    // Verify Merkle root
    require!(
        calculate_merkle_root(&ctx.accounts.trades) == merkle_root,
        ErrorCode::InvalidMerkleRoot
    );
    
    // Process net positions
    for trade in ctx.accounts.trades.iter() {
        update_position(ctx, trade)?;
    }
    
    Ok(())
}
```

### Pattern: Margin Calculation

**Implementation:**
```rust
pub fn calculate_margin_ratio(
    collateral: u64,
    unrealized_pnl: i64,
    maintenance_margin: u64,
) -> Result<u64> {
    // Use fixed-point arithmetic
    let total_equity = if unrealized_pnl >= 0 {
        collateral + unrealized_pnl as u64
    } else {
        collateral.saturating_sub(unrealized_pnl.unsigned_abs())
    };
    
    // Calculate ratio (multiply by 100 for percentage)
    let ratio = (total_equity * 100)
        .checked_div(maintenance_margin)
        .ok_or(ErrorCode::DivisionByZero)?;
    
    Ok(ratio)
}
```

### Pattern: Oracle Price Validation

**Implementation:**
```rust
pub fn validate_price(price_data: &PriceData) -> Result<()> {
    // Check staleness
    let clock = Clock::get()?;
    let max_age = 60; // 60 seconds
    
    require!(
        clock.unix_timestamp - price_data.timestamp < max_age,
        ErrorCode::StalePrice
    );
    
    // Check confidence
    let confidence_threshold = price_data.price / 100; // 1% threshold
    
    require!(
        price_data.confidence < confidence_threshold,
        ErrorCode::LowConfidence
    );
    
    Ok(())
}
```

---

## Key Takeaways

### Patterns to Use

1. **PDAs**: Deterministic addresses without keys
2. **CPI**: Call other programs for composability
3. **Account Constraints**: Validate accounts in Anchor
4. **Error Codes**: Clear, descriptive errors
5. **Events**: Emit for off-chain tracking
6. **Versioning**: Support migrations

### Pitfalls to Avoid

1. **Ownership Mistakes**: Always verify account ownership
2. **Seed Mismatches**: Use constants for seeds
3. **Rent Issues**: Ensure rent-exempt accounts
4. **Compute Limits**: Optimize and set budget
5. **Transaction Size**: Batch operations
6. **Overflow**: Use checked arithmetic
7. **Authority**: Always check authorization
8. **Account Ordering**: Writable accounts first

---

## Next Steps

- Review **[09-security-best-practices.md](./09-security-best-practices.md)** for security patterns
- Practice implementing these patterns in your component
- Study existing GoDark components for real examples

---

**Last Updated:** January 2025

