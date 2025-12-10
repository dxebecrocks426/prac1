# Rust Examples for Anchor Examples

This directory contains Rust examples demonstrating Solana concepts using the Rust SDK.

## 📁 Structure

```
examples-rust/
├── Cargo.toml          # Rust dependencies
├── src/
│   ├── 01_basic_setup.rs
│   ├── 02_account_operations.rs
│   ├── 03_transactions.rs
│   ├── 04_pda_examples.rs
│   └── 05_token_operations.rs
└── README.md           # This file
```

## 🚀 Quick Start

1. **Start localnet validator** (in a separate terminal):
   ```bash
   solana-test-validator
   ```

2. **Build the project**:
   ```bash
   cd examples-rust
   cargo build
   ```

3. **Run examples**:
   ```bash
   # Basic setup
   cargo run --bin 01_basic_setup

   # Account operations
   cargo run --bin 02_account_operations

   # Transactions
   cargo run --bin 03_transactions

   # PDA examples
   cargo run --bin 04_pda_examples

   # Token operations
   cargo run --bin 05_token_operations
   ```

## 📚 Examples Overview

### 01_basic_setup.rs
- Connect to Solana localnet
- Verify connection
- Get network information (version, slot, blockhash)

### 02_account_operations.rs
- Generate new keypairs
- Get account balances
- Request airdrops
- Check account information

### 03_transactions.rs
- Build transactions
- Sign transactions
- Send transactions
- Confirm transactions
- Verify balances

### 04_pda_examples.rs
- Derive PDAs
- Understand PDA seeds
- Use PDAs for program-owned accounts
- Collateral vault PDA patterns

### 05_token_operations.rs
- Create token mints
- Create token accounts
- Mint tokens
- Transfer tokens
- Check token balances

## 🔗 Related

- Main README: `../../README.md`
- Setup guide: `../../SETUP.md`

## 💡 Tips

- Each example is a separate binary (use `--bin` flag)
- Examples are designed to run independently
- All examples target localnet (safe for testing)
- Read the code comments for detailed explanations

