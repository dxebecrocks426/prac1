# Quick Reference Guide for GoDark DEX

## Overview

Quick reference cheat sheet for common operations, formulas, and commands in GoDark DEX development.

---

## PDA Derivation Formulas

### Basic PDA Derivation

```rust
use anchor_lang::prelude::*;

// Derive PDA
let (pda, bump) = Pubkey::find_program_address(
    &[
        b"seed1",
        seed2.as_ref(),
        program_id.as_ref(),
    ],
    program_id,
);

// Verify PDA in constraint
#[account(
    seeds = [b"seed1", seed2.key().as_ref()],
    bump
)]
pub pda_account: Account<'info, State>,
```

### Common PDA Patterns

**User-Specific:**
```rust
// Position PDA
let (position_pda, bump) = Pubkey::find_program_address(
    &[b"position", user_pubkey.as_ref()],
    program_id,
);

// Vault PDA
let (vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", user_pubkey.as_ref(), mint_pubkey.as_ref()],
    program_id,
);
```

**Global State:**
```rust
// Config PDA
let (config_pda, bump) = Pubkey::find_program_address(
    &[b"config"],
    program_id,
);
```

---

## Common Anchor Macros

### Program Macros

```rust
// Declare program ID
declare_id!("YourProgram111111111111111111111111111");

// Program module
#[program]
pub mod your_program {
    use super::*;
    
    pub fn instruction(ctx: Context<Accounts>, data: u64) -> Result<()> {
        Ok(())
    }
}
```

### Account Macros

```rust
// Account data structure
#[account]
pub struct State {
    pub data: u64,
}

// Account constraints
#[derive(Accounts)]
pub struct Accounts<'info> {
    #[account(init, payer = user, space = 8 + State::LEN)]
    pub state: Account<'info, State>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

### Constraint Macros

```rust
#[account(
    init,                    // Initialize account
    payer = user,            // Who pays rent
    space = 8 + 32,          // Account size
    seeds = [b"seed"],       // PDA seeds
    bump,                    // Bump seed
    mut,                     // Account is writable
    close = user,            // Close account and return rent
    has_one = user @ ErrorCode::Mismatch, // Verify field matches
    owner = program_id @ ErrorCode::InvalidOwner, // Verify owner
)]
pub account: Account<'info, State>,
```

---

## Account Size Calculations

### Size Formula

```
Total Size = Discriminator (8 bytes) + Sum of Field Sizes
```

### Common Field Sizes

```rust
// Primitive types
u8:     1 byte
u16:    2 bytes
u32:    4 bytes
u64:    8 bytes
i64:    8 bytes
bool:   1 byte

// Solana types
Pubkey: 32 bytes

// Vectors
Vec<T>: 4 bytes (length) + (T size × length)

// Strings
String: 4 bytes (length) + (1 byte × length)
```

### Example Calculation

```rust
#[account]
pub struct Position {
    pub user: Pubkey,        // 32 bytes
    pub size: u64,           // 8 bytes
    pub entry_price: u64,    // 8 bytes
    pub leverage: u8,        // 1 byte
    pub version: u32,        // 4 bytes
}

impl Position {
    pub const LEN: usize = 32 + 8 + 8 + 1 + 4; // 53 bytes
    // Total account size: 8 (discriminator) + 53 = 61 bytes
}
```

---

## Transaction Building Patterns

### Basic Transaction

```rust
use solana_sdk::transaction::Transaction;

let mut transaction = Transaction::new_with_payer(
    &[instruction],
    Some(&payer.pubkey()),
);

transaction.sign(&[&payer], recent_blockhash);
```

### Multiple Instructions

```rust
let mut instructions = Vec::new();

// Instruction 1
instructions.push(instruction1);

// Instruction 2
instructions.push(instruction2);

let transaction = Transaction::new_with_payer(
    &instructions,
    Some(&payer.pubkey()),
);
```

### Compute Budget

```rust
use solana_program::compute_budget::ComputeBudgetInstruction;

let compute_budget = ComputeBudgetInstruction::set_compute_unit_limit(400_000);
instructions.push(compute_budget);
```

---

## Error Code Reference

### Common Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Invalid input")]
    InvalidInput,
    
    #[msg("Account not found")]
    AccountNotFound,
    
    #[msg("Overflow")]
    Overflow,
    
    #[msg("Underflow")]
    Underflow,
}
```

### Solana Program Errors

```rust
// Common Solana errors
ProgramError::InsufficientFunds
ProgramError::InvalidAccountData
ProgramError::InvalidAccountOwner
ProgramError::AccountNotInitialized
ProgramError::ArithmeticOverflow
```

---

## SPL Token Operations Quick Reference

### Transfer Tokens

```rust
use anchor_spl::token::{self, Transfer};

pub fn transfer(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
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
```

### Mint Tokens

```rust
use anchor_spl::token::{self, MintTo};

pub fn mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, amount)?;
    Ok(())
}
```

### Burn Tokens

```rust
use anchor_spl::token::{self, Burn};

pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.from.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, amount)?;
    Ok(())
}
```

---

## Oracle Price Reading Patterns

### Read Price from Account

```rust
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

pub fn read_price(price_account: &AccountInfo) -> Result<u64> {
    let price_data = PriceUpdateV2::try_from(price_account.data.borrow().as_ref())?;
    
    // Validate price
    require!(
        price_data.price > 0,
        ErrorCode::InvalidPrice
    );
    
    Ok(price_data.price as u64)
}
```

### Validate Price Staleness

```rust
pub fn validate_price_staleness(price_data: &PriceData) -> Result<()> {
    let clock = Clock::get()?;
    let max_age = 60; // 60 seconds
    
    require!(
        clock.unix_timestamp - price_data.timestamp < max_age,
        ErrorCode::StalePrice
    );
    
    Ok(())
}
```

---

## Common CLI Commands

### Solana CLI

```bash
# Config
solana config set --url localhost
solana config get

# Keypair
solana-keygen new
solana-keygen pubkey

# Balance
solana balance
solana airdrop 2

# Program
solana program deploy target/deploy/program.so
solana program show <PROGRAM_ID>

# Account
solana account <PUBKEY>

# Transaction
solana confirm <SIGNATURE>
```

### Anchor CLI

```bash
# Build
anchor build

# Deploy
anchor deploy

# Test
anchor test

# IDL
anchor idl parse -f programs/program/src/lib.rs -o target/idl/program.json
```

### Cargo

```bash
# Build
cargo build

# Test
cargo test

# Format
cargo fmt

# Lint
cargo clippy

# Check
cargo check
```

---

## Debugging Commands

### View Account Data

```bash
# Raw data
solana account <PUBKEY>

# JSON format
solana account <PUBKEY> --output json

# Decode in program
let account_data = account_info.data.borrow();
let state = State::try_deserialize(&mut &account_data[8..])?;
```

### View Transaction

```bash
# Basic info
solana confirm <SIGNATURE>

# Verbose
solana confirm <SIGNATURE> --verbose

# In code
const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0
});
```

### View Logs

```bash
# Solana logs
solana logs

# Anchor logs
anchor test --skip-local-validator

# Program logs
msg!("Debug: value = {}", value);
```

---

## Financial Formulas

### Margin Calculations

```
Initial Margin = Notional Value / Leverage
Maintenance Margin = Notional Value × Maintenance Margin Rate
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

### Liquidation Price

```
Liquidation Price (Long) = Entry Price × (1 - Initial Margin / Maintenance Margin)
Liquidation Price (Short) = Entry Price × (1 + Initial Margin / Maintenance Margin)
```

---

## Key Takeaways

1. **PDAs**: Use `find_program_address` for derivation
2. **Account Size**: Discriminator (8) + field sizes
3. **CPIs**: Use Anchor's CPI helpers
4. **Errors**: Use `#[error_code]` enum
5. **Formulas**: Reference financial calculations
6. **CLI**: Quick command reference

---

## Next Steps

- Keep this guide handy for quick lookup
- Refer to detailed guides for explanations
- Practice using these patterns

---

**Last Updated:** January 2025

