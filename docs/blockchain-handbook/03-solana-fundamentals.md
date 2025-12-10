# Solana Fundamentals for GoDark Developers

## Overview

Solana is a high-performance blockchain designed for scalability and low transaction costs. Understanding Solana's unique architecture is essential for developing GoDark DEX components. This guide covers the core concepts you'll need.

---

## Solana Account Model

### What is an Account?

In Solana, **everything is an account**. Unlike Ethereum's contract storage model, Solana uses accounts to store both data and program code.

**Account Types:**

1. **Data Accounts**
   - Store application state
   - Owned by programs (smart contracts)
   - Can be owned by users (wallet accounts)
   - Contains data and metadata

2. **Program Accounts**
   - Store executable code (smart contracts)
   - Immutable once deployed (unless upgradeable)
   - Executed by the Solana runtime

3. **System Accounts**
   - Native Solana programs (System Program, Token Program, etc.)
   - Special accounts with specific functionality

### Account Structure

```rust
pub struct AccountInfo {
    pub key: &Pubkey,           // Account address
    pub lamports: &mut u64,     // SOL balance (rent)
    pub data: &mut [u8],        // Account data
    pub owner: &Pubkey,         // Program that owns this account
    pub executable: bool,       // Is this a program account?
    pub rent_epoch: u64,        // Rent exemption epoch
}
```

**Key Properties:**
- **key**: The account's public key (address)
- **lamports**: SOL balance (1 SOL = 1,000,000,000 lamports)
- **data**: Raw byte array storing account data
- **owner**: The program that controls this account
- **executable**: Whether this account contains executable code

### Account Ownership

- **User-owned accounts**: Controlled by private keys (wallets)
- **Program-owned accounts**: Controlled by programs (smart contracts)
- **System-owned accounts**: Owned by native Solana programs

**GoDark Example:**
- User's wallet account: User-owned
- Position account: Program-owned (by Position Management program)
- Collateral vault: Program-owned (by Collateral Vault program)

---

## Program Derived Addresses (PDAs)

### What are PDAs?

**PDAs** are addresses that don't have corresponding private keys. They're deterministically derived from:
- A program ID
- A set of seeds (byte arrays)
- A bump seed (to ensure the address is off the ed25519 curve)

### Why Use PDAs?

1. **Deterministic Addresses**: Same seeds = same address
2. **Program Control**: Only the program can sign for PDAs
3. **No Key Management**: No private keys to store or lose
4. **Cross-Program Invocations**: Programs can sign transactions on behalf of PDAs

### PDA Derivation

```rust
use anchor_lang::prelude::*;

// Derive a PDA
let (pda, bump) = Pubkey::find_program_address(
    &[
        b"vault",                    // seed 1
        user_pubkey.as_ref(),        // seed 2
        program_id.as_ref(),         // program ID
    ],
    program_id,                      // program that owns this PDA
);
```

**Common PDA Patterns in GoDark:**

1. **User-Specific Accounts**
   ```rust
   // Position PDA for a user
   let (position_pda, _bump) = Pubkey::find_program_address(
       &[b"position", user_pubkey.as_ref()],
       program_id,
   );
   ```

2. **Global State Accounts**
   ```rust
   // Global configuration PDA
   let (config_pda, _bump) = Pubkey::find_program_address(
       &[b"config"],
       program_id,
   );
   ```

3. **Token Accounts**
   ```rust
   // Vault token account PDA
   let (vault_token_pda, _bump) = Pubkey::find_program_address(
       &[b"vault", mint_pubkey.as_ref()],
       program_id,
   );
   ```

### PDA Signing

PDAs can sign transactions through **Cross-Program Invocations (CPIs)**:

```rust
// Sign with PDA seeds
let seeds = &[
    b"vault",
    user_pubkey.as_ref(),
    &[bump],
];
let signer = &[&seeds[..]];

// Use in CPI
invoke_signed(
    &instruction,
    &account_infos,
    &[signer],
)?;
```

---

## Transactions and Instructions

### Transaction Structure

A Solana transaction contains:
- **Signatures**: Required signatures (up to 64)
- **Message**: Transaction details
  - **Header**: Account metadata
  - **Account Keys**: All accounts involved
  - **Recent Blockhash**: For transaction expiration
  - **Instructions**: What to execute

### Instruction Structure

```rust
pub struct Instruction {
    pub program_id: Pubkey,      // Program to execute
    pub accounts: Vec<AccountMeta>, // Accounts involved
    pub data: Vec<u8>,           // Instruction data
}
```

**AccountMeta:**
```rust
pub struct AccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,         // Must sign transaction
    pub is_writable: bool,       // Account data will change
}
```

### Transaction Fees

- **Base Fee**: 5,000 lamports (0.000005 SOL) per transaction
- **Rent**: For account creation (can be rent-exempt)
- **Priority Fees**: Optional fees for faster processing

**GoDark Consideration:** Batch settlements reduce per-trade fees by combining multiple operations into one transaction.

---

## Cross-Program Invocations (CPIs)

### What are CPIs?

**CPIs** allow Solana programs to call other programs, similar to function calls in traditional programming.

### CPI Example: Token Transfer

```rust
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

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
```

### CPI with PDA Signing

```rust
// Sign with PDA for CPI
let seeds = &[
    b"vault",
    user_pubkey.as_ref(),
    &[bump],
];
let signer = &[&seeds[..]];

let cpi_ctx = CpiContext::new_with_signer(
    token_program,
    cpi_accounts,
    signer,
);

token::transfer(cpi_ctx, amount)?;
```

**GoDark Usage:**
- Collateral vault transfers tokens via CPI
- Position management locks/unlocks collateral via CPI
- Settlement relayer executes multiple CPIs in batch

---

## Anchor Framework Basics

### What is Anchor?

**Anchor** is a framework for building Solana programs that provides:
- **IDL (Interface Definition Language)**: Type-safe program interfaces
- **Macros**: Simplify common patterns
- **Client SDKs**: TypeScript, Rust clients
- **Testing**: Built-in testing framework

### Anchor Program Structure

```rust
use anchor_lang::prelude::*;

declare_id!("YourProgram111111111111111111111111111");

#[program]
pub mod your_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        ctx.accounts.state.data = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct State {
    pub data: u64,
}
```

### Key Anchor Concepts

1. **`#[program]`**: Marks the program module
2. **`#[derive(Accounts)]`**: Account validation struct
3. **`#[account]`**: Marks account data structures
4. **`Account<'info, T>`**: Type-safe account wrapper
5. **`Signer<'info>`**: Account that must sign
6. **`Program<'info, T>`**: Program account

### Account Constraints

```rust
#[derive(Accounts)]
pub struct Example<'info> {
    #[account(
        init,                    // Initialize account
        payer = user,            // Who pays rent
        space = 8 + 32,          // Account size (discriminator + data)
        seeds = [b"seed"],       // PDA seeds
        bump                     // Bump seed
    )]
    pub pda: Account<'info, State>,
    
    #[account(mut)]              // Account is writable
    pub user: Signer<'info>,     // Must sign
    
    #[account(owner = token::ID)] // Must be owned by Token Program
    pub token_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
}
```

### Error Handling

```rust
use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid authority")]
    InvalidAuthority,
}

// In instruction
if amount > balance {
    return Err(ErrorCode::InsufficientFunds.into());
}
```

---

## SPL Token Integration

### SPL Token Overview

**SPL Token** is Solana's token standard (similar to ERC-20 on Ethereum). GoDark uses USDT (SPL Token) as collateral.

### Key Concepts

1. **Mint**: Token definition (like a token contract)
2. **Token Account**: Holds tokens for a user
3. **Associated Token Account (ATA)**: Standard token account address

### Token Operations

**Transfer Tokens:**
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

**Mint Tokens:**
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

**GoDark Usage:**
- Collateral vault manages USDT token accounts
- Users deposit/withdraw USDT
- Positions lock/unlock collateral via token accounts

---

## Solana Runtime Constraints

### Compute Units

- **Default**: 200,000 compute units per transaction
- **Can be increased**: Up to 1,400,000 with `ComputeBudgetInstruction`
- **Exhaustion**: Transaction fails if compute units exceeded

**Optimization Tips:**
- Minimize loops
- Use efficient data structures
- Batch operations when possible
- Cache expensive computations

### Account Size Limits

- **Maximum**: 10 MB per account
- **Rent**: Accounts must be rent-exempt or pay rent
- **Rent-Exempt**: Minimum balance to be exempt from rent

**Rent Calculation:**
```rust
// Calculate rent-exempt minimum
let rent = Rent::get()?;
let space = 8 + 32; // discriminator + data
let rent_lamports = rent.minimum_balance(space);
```

### Transaction Size Limits

- **Maximum**: 1,232 bytes per transaction
- **Accounts**: Up to 64 accounts per transaction
- **Instructions**: Multiple instructions per transaction

**GoDark Impact:**
- Batch settlements must fit within size limits
- Account ordering matters (writable accounts first)

---

## Rent and Account Ownership

### Rent System

Solana uses a **rent** system to prevent blockchain bloat:
- Accounts pay rent based on data size
- **Rent-exempt**: Accounts with minimum balance are exempt
- **Rent-paying**: Accounts below minimum pay rent periodically

### Rent-Exempt Minimum

```rust
use anchor_lang::prelude::*;

let rent = Rent::get()?;
let space = 8 + 32; // Account size
let minimum_balance = rent.minimum_balance(space);
```

### Account Initialization

```rust
#[account(init, payer = user, space = 8 + 32)]
pub state: Account<'info, State>,
```

- **`init`**: Creates new account
- **`payer`**: Who pays for account creation
- **`space`**: Account size in bytes

### Closing Accounts

```rust
// Close account and refund rent
**ctx.accounts.state.to_account_info().try_borrow_mut_lamports()? -= rent;
**ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += rent;
```

---

## Clock and Epoch Sysvars

### Clock Sysvar

Provides current blockchain time:

```rust
use anchor_lang::solana_program::clock::Clock;

let clock = Clock::get()?;
let current_timestamp = clock.unix_timestamp;
let current_slot = clock.slot;
```

**GoDark Usage:**
- Timelock enforcement in upgrade system
- Funding rate calculation timing
- Session expiry in ephemeral vaults

### Epoch

- **Epoch**: ~2-3 days of slots
- **Slot**: ~400ms time unit
- **Epoch Boundary**: When validator set changes

---

## Common Solana Patterns

### Pattern 1: PDA Authority

```rust
// Derive PDA that will be authority
let (authority_pda, bump) = Pubkey::find_program_address(
    &[b"authority"],
    program_id,
);

// Verify PDA is signer
require!(
    ctx.accounts.authority.key() == &authority_pda,
    ErrorCode::InvalidAuthority
);
```

### Pattern 2: Account Initialization

```rust
#[account(init, payer = user, space = 8 + State::LEN)]
pub state: Account<'info, State>,

impl State {
    pub const LEN: usize = 32 + 8; // Define size
}
```

### Pattern 3: Account Validation

```rust
#[account(
    constraint = token_account.owner == token::ID @ ErrorCode::InvalidTokenAccount,
    constraint = token_account.mint == expected_mint @ ErrorCode::InvalidMint,
)]
pub token_account: Account<'info, TokenAccount>,
```

### Pattern 4: Mutability Checks

```rust
#[account(mut)]  // Account will be modified
pub user_account: Account<'info, UserAccount>,

#[account(mut)]
pub vault: Account<'info, Vault>,
```

---

## GoDark-Specific Patterns

### Position Account Pattern

```rust
#[account]
pub struct Position {
    pub user: Pubkey,
    pub market: Pubkey,
    pub size: i64,              // Positive = long, negative = short
    pub entry_price: u64,
    pub collateral: u64,
    pub leverage: u8,
    pub version: u32,           // For migrations
}
```

### Vault PDA Pattern

```rust
// Derive vault PDA
let (vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", user_pubkey.as_ref()],
    program_id,
);

// Sign with vault PDA
let seeds = &[
    b"vault",
    user_pubkey.as_ref(),
    &[bump],
];
```

### Batch Settlement Pattern

```rust
// Multiple instructions in one transaction
let mut instructions = Vec::new();

for trade in trades {
    instructions.push(create_settle_instruction(trade)?);
}

// Execute batch
invoke_many(&instructions, &account_infos)?;
```

---

## Key Takeaways

1. **Everything is an account** - Data, programs, tokens all use accounts
2. **PDAs enable program control** - Deterministic addresses without private keys
3. **CPIs enable composability** - Programs call other programs
4. **Anchor simplifies development** - Type-safe, macro-based framework
5. **SPL Token is standard** - USDT uses SPL Token standard
6. **Constraints matter** - Compute units, account size, transaction size
7. **Rent system prevents bloat** - Accounts must be rent-exempt or pay rent

---

## Next Steps

- Review **[04-perpetual-futures-primer.md](./04-perpetual-futures-primer.md)** for DeFi mechanics
- Study **[05-component-overview.md](./05-component-overview.md)** for component details
- Practice with Anchor tutorials: https://www.anchor-lang.com/

---

**Last Updated:** January 2025

