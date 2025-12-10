# Troubleshooting Guide for GoDark DEX

## Overview

Common issues, error messages, and solutions for GoDark DEX development. Use this guide to quickly resolve problems.

---

## Build Errors and Solutions

### Error: "Program ID mismatch"

**Problem:**
```
Error: Program ID mismatch
```

**Solution:**
```bash
# Update Anchor.toml with correct program ID
[programs.localnet]
your_program = "YourProgram111111111111111111111111111"

# Or regenerate program ID
anchor keys list
anchor keys sync
```

---

### Error: "Account discriminator already in use"

**Problem:**
```
Error: Account discriminator already in use
```

**Solution:**
```rust
// Change account struct name or add version field
#[account]
pub struct PositionV2 {  // Changed name
    pub version: u32,
    // ... fields
}
```

---

### Error: "Failed to get recent blockhash"

**Problem:**
```
Error: Failed to get recent blockhash
```

**Solution:**
```bash
# Check RPC connection
solana config get

# Test connection
solana balance

# If localnet, ensure validator is running
solana-test-validator
```

---

### Error: "Insufficient funds for transaction"

**Problem:**
```
Error: Insufficient funds for transaction
```

**Solution:**
```bash
# Check balance
solana balance

# Airdrop SOL (devnet/localnet)
solana airdrop 2

# Check rent requirements
# Accounts need rent-exempt balance
```

---

## Deployment Issues

### Error: "Program failed to deploy"

**Problem:**
```
Error: Program failed to deploy
```

**Solutions:**
1. **Check program size:**
   ```bash
   # Solana programs have size limits
   ls -lh target/deploy/your_program.so
   ```

2. **Verify build:**
   ```bash
   anchor build
   cargo build-sbf
   ```

3. **Check RPC endpoint:**
   ```bash
   solana config get
   solana balance
   ```

---

### Error: "Upgrade authority mismatch"

**Problem:**
```
Error: Upgrade authority mismatch
```

**Solution:**
```bash
# Check upgrade authority
solana program show <PROGRAM_ID>

# Set correct upgrade authority
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <AUTHORITY>
```

---

### Error: "Program account data too large"

**Problem:**
```
Error: Program account data too large
```

**Solution:**
- Optimize program code
- Remove unused dependencies
- Split into multiple programs if needed

---

## Transaction Failures

### Error: "Insufficient funds for rent"

**Problem:**
```
Error: Insufficient funds for rent
```

**Solution:**
```rust
// Calculate rent-exempt minimum
let rent = Rent::get()?;
let space = 8 + State::LEN;
let minimum_balance = rent.minimum_balance(space);

// Ensure account has enough balance
require!(
    account.lamports() >= minimum_balance,
    ErrorCode::InsufficientBalance
);
```

---

### Error: "Compute budget exceeded"

**Problem:**
```
Error: Compute budget exceeded
```

**Solution:**
```rust
// Set higher compute budget
use solana_program::compute_budget::ComputeBudgetInstruction;

let compute_budget = ComputeBudgetInstruction::set_compute_unit_limit(400_000);
instructions.push(compute_budget);
```

**Or optimize code:**
- Reduce loops
- Use efficient algorithms
- Cache expensive computations

---

### Error: "Transaction too large"

**Problem:**
```
Error: Transaction too large
```

**Solution:**
- Reduce number of accounts
- Reduce instruction data size
- Split into multiple transactions
- Use netting to reduce operations

---

### Error: "Account not found"

**Problem:**
```
Error: Account not found
```

**Solution:**
```rust
// Check account exists before using
let account_info = ctx.accounts.account.to_account_info();
require!(
    account_info.data_len() > 0,
    ErrorCode::AccountNotFound
);
```

---

### Error: "Invalid account owner"

**Problem:**
```
Error: Invalid account owner
```

**Solution:**
```rust
// Verify account ownership
require!(
    ctx.accounts.account.owner == ctx.program_id,
    ErrorCode::InvalidAccountOwner
);

// Or use Anchor constraint
#[account(
    owner = program_id @ ErrorCode::InvalidAccountOwner
)]
pub account: Account<'info, State>,
```

---

## Account Initialization Problems

### Error: "Account already initialized"

**Problem:**
```
Error: Account already initialized
```

**Solution:**
```rust
// Check if account exists
let account = program.account.state.fetch_optional(&state_pda).await?;

if account.is_none() {
    // Initialize account
    program.methods.initialize().rpc()?;
} else {
    // Account already exists, use it
}
```

---

### Error: "Account space calculation incorrect"

**Problem:**
```
Error: Account space calculation incorrect
```

**Solution:**
```rust
// Calculate size accurately
#[account]
pub struct State {
    pub field1: u64,    // 8 bytes
    pub field2: Pubkey, // 32 bytes
    pub field3: u8,     // 1 byte
}

impl State {
    pub const LEN: usize = 8 + 32 + 1; // 41 bytes
    // Total: 8 (discriminator) + 41 = 49 bytes
}

#[account(init, payer = user, space = 8 + State::LEN)]
pub state: Account<'info, State>,
```

---

## PDA Derivation Issues

### Error: "PDA derivation failed"

**Problem:**
```
Error: PDA derivation failed
```

**Solution:**
```rust
// Ensure seeds match exactly
const SEED: &[u8] = b"seed";

let (pda, bump) = Pubkey::find_program_address(
    &[SEED, other_seed.as_ref()],
    program_id,
);

// Use same seeds in constraint
#[account(
    seeds = [SEED, other_seed.key().as_ref()],
    bump
)]
pub pda: Account<'info, State>,
```

---

### Error: "Invalid PDA signer"

**Problem:**
```
Error: Invalid PDA signer
```

**Solution:**
```rust
// Include bump in seeds for signing
let seeds = &[
    b"seed",
    other_seed.as_ref(),
    &[bump], // Include bump!
];
let signer = &[&seeds[..]];

// Use in CPI
let cpi_ctx = CpiContext::new_with_signer(
    program,
    accounts,
    signer,
);
```

---

## CPI Failures

### Error: "CPI call failed"

**Problem:**
```
Error: CPI call failed
```

**Solution:**
1. **Verify program ID:**
   ```rust
   require!(
       ctx.accounts.token_program.key() == &token::ID,
       ErrorCode::InvalidProgram
   );
   ```

2. **Check account ownership:**
   ```rust
   require!(
       ctx.accounts.token_account.owner == &token::ID,
       ErrorCode::InvalidAccountOwner
   );
   ```

3. **Verify signer:**
   ```rust
   // Ensure authority is signer or PDA signer
   let seeds = &[b"vault", user.key().as_ref(), &[bump]];
   let signer = &[&seeds[..]];
   ```

---

### Error: "Insufficient token balance"

**Problem:**
```
Error: Insufficient token balance
```

**Solution:**
```rust
// Check balance before transfer
let balance = ctx.accounts.from.amount;
require!(
    balance >= amount,
    ErrorCode::InsufficientBalance
);
```

---

## Testing Issues

### Error: "Test timeout"

**Problem:**
```
Error: Test timeout
```

**Solution:**
```typescript
// Increase timeout
it("test", async () => {
  // Test code
}).timeout(60000); // 60 seconds

// Or in anchor test
anchor test -- --timeout 60000
```

---

### Error: "Account not found in test"

**Problem:**
```
Error: Account not found in test
```

**Solution:**
```typescript
// Initialize account before use
await program.methods
  .initialize()
  .accounts({
    state: statePDA,
    user: user.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Then use account
const state = await program.account.state.fetch(statePDA);
```

---

### Error: "Transaction simulation failed"

**Problem:**
```
Error: Transaction simulation failed
```

**Solution:**
```typescript
// Check simulation logs
const simulation = await connection.simulateTransaction(transaction);
console.log("Error:", simulation.value.err);
console.log("Logs:", simulation.value.logs);

// Fix issues based on logs
```

---

## Performance Problems

### Issue: "High compute unit usage"

**Problem:**
Program uses too many compute units.

**Solutions:**
1. **Optimize algorithms:**
   - Use O(n log n) instead of O(n²)
   - Cache expensive computations
   - Reduce loops

2. **Batch operations:**
   - Process multiple items efficiently
   - Use vectorized operations

3. **Set compute budget:**
   ```rust
   let compute_budget = ComputeBudgetInstruction::set_compute_unit_limit(400_000);
   ```

---

### Issue: "Transaction too slow"

**Problem:**
Transactions take too long to confirm.

**Solutions:**
1. **Use priority fees:**
   ```rust
   let priority_fee = ComputeBudgetInstruction::set_compute_unit_price(1000);
   ```

2. **Optimize transaction size:**
   - Reduce number of accounts
   - Minimize instruction data

3. **Use faster RPC:**
   - Use dedicated RPC endpoint
   - Consider private RPC

---

## Debugging Strategies

### Strategy 1: Check Logs

```rust
// Add debug logs
msg!("Debug: value = {}", value);
msg!("Debug: account = {}", account.key());

// View logs
solana logs
```

---

### Strategy 2: Inspect Accounts

```bash
# View account data
solana account <PUBKEY>

# Decode account
anchor account <ACCOUNT_NAME> --program-id <PROGRAM_ID>
```

---

### Strategy 3: Simulate Transactions

```typescript
// Simulate before sending
const simulation = await connection.simulateTransaction(transaction);
console.log("Compute units:", simulation.value.unitsConsumed);
console.log("Logs:", simulation.value.logs);
```

---

### Strategy 4: Use Explorer

**View Transaction:**
- Solana Explorer: https://explorer.solana.com/tx/<SIGNATURE>
- Solscan: https://solscan.io/tx/<SIGNATURE>

**View Account:**
- Solana Explorer: https://explorer.solana.com/address/<PUBKEY>
- Solscan: https://solscan.io/account/<PUBKEY>

---

## Getting Help

### Where to Ask

1. **GoDark Team:**
   - Component lead
   - Technical lead
   - Discord channel

2. **Community:**
   - Solana Discord
   - Anchor Discord
   - Stack Overflow

### What to Provide

**When asking for help, include:**
1. **Error message**: Full error text
2. **Code snippet**: Relevant code
3. **Steps to reproduce**: How to trigger the issue
4. **Environment**: Localnet/devnet/mainnet
5. **Logs**: Transaction logs or program logs
6. **Account data**: Relevant account pubkeys

**Example:**
```
Error: Account not found

Code:
```rust
let account = program.account.state.fetch(state_pda).await?;
```

Steps:
1. Deploy program
2. Call initialize
3. Call instruction that uses account

Environment: Localnet
Logs: [paste logs]
Account: <PUBKEY>
```

---

## Common Error Codes

### Solana Program Errors

```rust
ProgramError::InsufficientFunds
ProgramError::InvalidAccountData
ProgramError::InvalidAccountOwner
ProgramError::AccountNotInitialized
ProgramError::ArithmeticOverflow
ProgramError::InsufficientFundsForFee
ProgramError::InvalidInstructionData
ProgramError::InvalidAccountData
ProgramError::AccountDataTooSmall
ProgramError::AccountNotExecutable
ProgramError::AccountBorrowFailed
ProgramError::AccountBorrowOutstanding
ProgramError::DuplicateInstruction
ProgramError::ExecutableDataModified
ProgramError::ExecutableLamportChange
ProgramError::ExecutableAccountNotRentExempt
ProgramError::UnbalancedInstruction
ProgramError::ModifiedProgramId
ProgramError::ExternalAccountLamportSpend
ProgramError::ExternalAccountDataModified
ProgramError::ReadonlyLamportChange
ProgramError::ReadonlyDataModified
ProgramError::DuplicateAccountIndex
ProgramError::ExecutableAccountNotExecutable
ProgramError::RentEpochModified
ProgramError::NotEnoughAccountKeys
ProgramError::AccountDataSizeChanged
ProgramError::AccountNotEnoughKeys
ProgramError::AccountNotEnoughKeys
ProgramError::AccountNotEnoughKeys
```

---

## Key Takeaways

1. **Check Basics**: RPC, balance, account existence
2. **Verify Ownership**: Account ownership and authority
3. **Validate Inputs**: Size, format, constraints
4. **Use Logs**: Debug with `msg!` macro
5. **Inspect Accounts**: Use `solana account` command
6. **Simulate First**: Test before sending
7. **Ask for Help**: Provide context and logs

---

## Next Steps

- Refer to specific guides for detailed explanations
- Practice debugging with these strategies
- Keep this guide handy for quick reference

---

**Last Updated:** January 2025

