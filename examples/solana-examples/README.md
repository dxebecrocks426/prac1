# Solana Learning Examples

This directory contains beginner-friendly examples for learning Solana blockchain development. These examples are designed to help you understand Solana concepts before working on the collateral vault assignment.

## 📁 Structure

```
solana-examples/
├── rust-scripts/          # Standalone Rust examples
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       └── examples/
│           ├── connect_localnet.rs
│           ├── get_balance.rs
│           ├── airdrop.rs
│           ├── create_account.rs
│           ├── send_transaction.rs
│           ├── pda_basics.rs
│           └── token_basics.rs
│
├── anchor-examples/        # Rust/Anchor examples
│   ├── Anchor.toml
│   └── examples-rust/      # Rust examples
│       ├── Cargo.toml
│       └── src/
│           ├── 01_basic_setup.rs
│           ├── 02_account_operations.rs
│           ├── 03_transactions.rs
│           ├── 04_pda_examples.rs
│           └── 05_token_operations.rs
│
├── README.md              # This file
└── SETUP.md               # Detailed setup instructions
```

## 🚀 Quick Start

### Prerequisites

1. **Rust** (1.75+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Solana CLI Tools**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

### Running Rust Examples

1. **Start localnet validator** (in a separate terminal):
   ```bash
   solana-test-validator
   ```

2. **Navigate to rust-scripts**:
   ```bash
   cd rust-scripts
   ```

3. **Build the project**:
   ```bash
   cargo build
   ```

4. **Run examples**:
   ```bash
   # Connect to localnet
   cargo run -- connect

   # Create a new account
   cargo run -- create-account

   # Get balance (replace with your address)
   cargo run -- balance <YOUR_ADDRESS>

   # Request airdrop (replace with your address)
   cargo run -- airdrop <YOUR_ADDRESS> 1

   # Learn about PDAs
   cargo run -- pda-basics

   # Learn about tokens
   cargo run -- token-basics
   ```

### Running Anchor Examples (Rust)

1. **Start localnet validator** (in a separate terminal):
   ```bash
   solana-test-validator
   ```

2. **Navigate to anchor-examples/examples-rust**:
   ```bash
   cd anchor-examples/examples-rust
   ```

3. **Build the project**:
   ```bash
   cargo build
   ```

4. **Run examples**:
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

### Rust Scripts

- **connect_localnet**: Connect to local Solana validator
- **get_balance**: Query account balance
- **airdrop**: Request SOL airdrop (localnet only)
- **create_account**: Generate new keypair
- **send_transaction**: Send SOL between accounts
- **pda_basics**: Learn about Program Derived Addresses
- **token_basics**: Understand SPL Token concepts

### Rust Examples (in anchor-examples/examples-rust)

- **01_basic_setup**: Connect and verify localnet connection
- **02_account_operations**: Create accounts, check balances, request airdrops
- **03_transactions**: Build, sign, and send transactions
- **04_pda_examples**: Derive and work with PDAs
- **05_token_operations**: Create mints, token accounts, mint and transfer tokens

## 🎯 Learning Path

1. **Start with Rust scripts** to understand basic concepts
2. **Move to Anchor Rust examples** for more structured learning
3. **Focus on PDAs** - critical for collateral vault
4. **Master token operations** - USDT is an SPL Token
5. **Understand transactions** - everything on Solana is a transaction

## 🔗 Related Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Solana Cookbook](https://solanacookbook.com/)

## 💡 Tips

- **Always run `solana-test-validator` first** before running examples
- **Localnet is free** - airdrops work without limits
- **Keep private keys secure** - never share them
- **Read the code comments** - they explain Solana concepts
- **Experiment** - modify the examples to learn more

## 🐛 Troubleshooting

### "Failed to connect to localnet"
- Make sure `solana-test-validator` is running
- Check it's running on port 8899 (default)

### "Insufficient funds"
- Request an airdrop: `cargo run -- airdrop <ADDRESS> 1`

### Build errors (Rust)
- Make sure Rust is up to date: `rustup update`
- Check Cargo.toml dependencies are correct

## 📖 Next Steps

After completing these examples, you'll be ready to:
- Work on the collateral vault assignment
- Understand how Solana programs work
- Build and deploy your own programs
- Integrate with the GoDark DEX system

For detailed setup instructions, see [SETUP.md](./SETUP.md).

