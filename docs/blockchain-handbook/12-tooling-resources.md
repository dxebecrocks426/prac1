# Tooling and Resources for GoDark DEX Development

## Overview

This guide provides a comprehensive reference for essential tools, commands, and resources used in GoDark DEX development.

---

## Development Tools

### Solana CLI Commands Reference

**Configuration:**
```bash
# Set RPC endpoint
solana config set --url localhost        # Localnet
solana config set --url devnet           # Devnet
solana config set --url mainnet-beta     # Mainnet

# View current config
solana config get

# Set keypair
solana config set --keypair ~/.config/solana/id.json
```

**Keypair Management:**
```bash
# Generate new keypair
solana-keygen new

# Generate keypair with specific path
solana-keygen new --outfile ~/my-keypair.json

# View public key
solana-keygen pubkey

# View public key from file
solana-keygen pubkey ~/my-keypair.json
```

**Account Management:**
```bash
# Check balance
solana balance

# Check balance of specific account
solana balance <PUBKEY>

# Airdrop SOL (devnet/localnet only)
solana airdrop 2

# Transfer SOL
solana transfer <RECIPIENT> 1 --allow-unfunded-recipient
```

**Program Management:**
```bash
# Deploy program
solana program deploy target/deploy/your_program.so

# Upgrade program
solana program deploy --program-id <PROGRAM_ID> target/deploy/your_program.so

# Show program info
solana program show <PROGRAM_ID>

# Close program (recover rent)
solana program close <PROGRAM_ID>
```

**Account Inspection:**
```bash
# View account data
solana account <ACCOUNT_PUBKEY>

# View account data as JSON
solana account <ACCOUNT_PUBKEY> --output json

# View program account
solana account <PROGRAM_ID> --output json
```

**Transaction Management:**
```bash
# Confirm transaction
solana confirm <SIGNATURE>

# View transaction details
solana confirm <SIGNATURE> --verbose

# Get transaction history
solana transaction-history <ACCOUNT_PUBKEY>
```

---

### Anchor CLI Commands

**Project Management:**
```bash
# Initialize new Anchor project
anchor init <project-name>

# Build program
anchor build

# Build and deploy
anchor build && anchor deploy

# Clean build artifacts
anchor clean
```

**Testing:**
```bash
# Run tests
anchor test

# Run specific test file
anchor test tests/your-test.ts

# Run with verbose output
anchor test -- --verbose

# Run with logs
anchor test --skip-local-validator
```

**IDL Management:**
```bash
# Generate IDL from program
anchor idl parse -f programs/your-program/src/lib.rs -o target/idl/your_program.json

# Initialize IDL on-chain
anchor idl init --filepath target/idl/your_program.json <PROGRAM_ID>

# Upgrade IDL
anchor idl upgrade --filepath target/idl/your_program.json <PROGRAM_ID>
```

**Local Validator:**
```bash
# Start local validator
solana-test-validator

# Start with specific features
solana-test-validator --reset

# Start with logs
solana-test-validator --log
```

---

### Rust Tooling

**Cargo Commands:**
```bash
# Build project
cargo build

# Build release
cargo build --release

# Run tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture

# Check code (no build)
cargo check

# Format code
cargo fmt

# Lint code
cargo clippy

# Clippy with fixes
cargo clippy --fix
```

**Useful Cargo Flags:**
```bash
# Build for specific target
cargo build --target bpf-unknown-unknown

# Build with features
cargo build --features feature-name

# Update dependencies
cargo update

# Show dependency tree
cargo tree

# Show outdated dependencies
cargo outdated
```

---

### IDEs and Extensions

**VS Code:**
- **Rust Analyzer**: Language server for Rust
- **Solana**: Solana development tools
- **Anchor**: Anchor framework support
- **Error Lens**: Inline error display

**Setup:**
```bash
# Install Rust Analyzer extension
code --install-extension rust-lang.rust-analyzer

# Install Solana extension
code --install-extension solana.solana-dev
```

**IntelliJ IDEA / CLion:**
- Rust plugin
- Solana plugin (community)

---

## Testing Tools

### Anchor Test Framework

**Setup:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.YourProgram;
  
  it("test", async () => {
    // Test code
  });
});
```

**Useful Test Utilities:**
```typescript
// Airdrop SOL
await provider.connection.requestAirdrop(
  user.publicKey,
  10 * anchor.web3.LAMPORTS_PER_SOL
);

// Wait for confirmation
await provider.connection.confirmTransaction(signature, "confirmed");

// Get account data
const account = await program.account.state.fetch(statePDA);
```

---

### Solana Test Utilities

**Test Validator:**
```bash
# Start validator
solana-test-validator

# With reset
solana-test-validator --reset

# With specific program
solana-test-validator --clone <PROGRAM_ID>
```

**Transaction Simulation:**
```typescript
// Simulate transaction
const simulation = await connection.simulateTransaction(transaction);
console.log("Compute units:", simulation.value.unitsConsumed);
console.log("Logs:", simulation.value.logs);
```

---

## Debugging Tools

### Solana Explorer

**URLs:**
- **Mainnet**: https://explorer.solana.com/
- **Devnet**: https://explorer.solana.com/?cluster=devnet
- **Localnet**: http://localhost:8899 (if running local validator)

**Features:**
- View transactions
- Inspect accounts
- Check program deployments
- View token balances

**Usage:**
```
https://explorer.solana.com/tx/<SIGNATURE>
https://explorer.solana.com/address/<PUBKEY>
https://explorer.solana.com/account/<ACCOUNT_PUBKEY>
```

---

### Solscan

**URL:** https://solscan.io/

**Features:**
- Transaction history
- Account analysis
- Token tracking
- Program inspection

---

### Anchor IDL Viewer

**View Program Interface:**
```bash
# Generate IDL
anchor idl parse -f programs/your-program/src/lib.rs -o target/idl/your_program.json

# View IDL
cat target/idl/your_program.json | jq
```

**Online Viewer:**
- Upload IDL JSON to view program interface
- See all instructions and accounts

---

### Transaction Decoders

**Decode Transaction:**
```bash
# Using Solana CLI
solana confirm <SIGNATURE> --verbose

# Using web3.js
const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0
});
console.log(tx);
```

**Decode Account Data:**
```rust
use anchor_lang::AccountDeserialize;

let account_data = account_info.data.borrow();
let position = Position::try_deserialize(&mut &account_data[8..])?;
```

---

## Resources

### Official Documentation

**Solana:**
- **Docs**: https://docs.solana.com/
- **Cookbook**: https://solanacookbook.com/
- **API Reference**: https://docs.rs/solana-sdk/

**Anchor:**
- **Book**: https://www.anchor-lang.com/
- **API Docs**: https://docs.rs/anchor-lang/
- **Examples**: https://github.com/coral-xyz/anchor/tree/master/examples

**SPL Token:**
- **Docs**: https://spl.solana.com/token
- **Program**: https://github.com/solana-labs/solana-program-library

---

### GoDark Resources

**Technical Architecture:**
- GoDark DEX Technical Architecture Document
- Component assignment documentation
- Architecture diagrams

**Component Assignments:**
- Settlement Relayer assignment
- Position Management assignment
- Liquidation Engine assignment
- Ephemeral Vault assignment
- Funding Rate assignment
- Oracle Integration assignment
- Collateral Vault assignment
- Program Upgrade assignment

---

### Community Resources

**Discord:**
- Solana Discord: https://discord.gg/solana
- Anchor Discord: https://discord.gg/anchorlang

**Forums:**
- Solana Stack Exchange: https://solana.stackexchange.com/
- Reddit: r/solana

**GitHub:**
- Solana: https://github.com/solana-labs/solana
- Anchor: https://github.com/coral-xyz/anchor
- SPL: https://github.com/solana-labs/solana-program-library

---

## Useful Scripts

### Build Script

**build.sh:**
```bash
#!/bin/bash
set -e

echo "Building Anchor program..."
anchor build

echo "Generating IDL..."
anchor idl parse -f programs/your-program/src/lib.rs -o target/idl/your_program.json

echo "Build complete!"
```

### Deploy Script

**deploy.sh:**
```bash
#!/bin/bash
set -e

CLUSTER=${1:-localnet}

echo "Deploying to $CLUSTER..."

if [ "$CLUSTER" = "localnet" ]; then
    solana config set --url localhost
    anchor build
    anchor deploy
elif [ "$CLUSTER" = "devnet" ]; then
    solana config set --url devnet
    anchor build
    anchor deploy --provider.cluster devnet
else
    echo "Unknown cluster: $CLUSTER"
    exit 1
fi

echo "Deployment complete!"
```

### Test Script

**test.sh:**
```bash
#!/bin/bash
set -e

echo "Running tests..."

# Start validator in background
solana-test-validator &
VALIDATOR_PID=$!

# Wait for validator to start
sleep 5

# Run tests
anchor test

# Stop validator
kill $VALIDATOR_PID

echo "Tests complete!"
```

---

## Environment Setup

### Required Environment Variables

**.env.example:**
```bash
# Solana
SOLANA_RPC_URL=http://localhost:8899
ANCHOR_PROVIDER_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost/godark_dev

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3000
API_HOST=0.0.0.0

# Oracle
PYTH_RPC_URL=https://api.mainnet-beta.solana.com
SWITCHBOARD_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## Quick Reference

### Common Commands

**Development:**
```bash
# Start local validator
solana-test-validator

# Build and deploy
anchor build && anchor deploy

# Run tests
anchor test

# Check balance
solana balance
```

**Debugging:**
```bash
# View account
solana account <PUBKEY>

# Confirm transaction
solana confirm <SIGNATURE>

# View logs
solana logs
```

**Program Management:**
```bash
# Deploy program
solana program deploy target/deploy/program.so

# Show program
solana program show <PROGRAM_ID>

# Close program
solana program close <PROGRAM_ID>
```

---

## Key Takeaways

1. **Solana CLI**: Essential for account and program management
2. **Anchor CLI**: Simplifies program development
3. **Rust Tools**: Cargo, clippy, fmt for code quality
4. **Explorers**: Solana Explorer, Solscan for debugging
5. **Documentation**: Official docs and community resources
6. **Scripts**: Automate common tasks

---

## Next Steps

- Review **[13-quick-reference.md](./13-quick-reference.md)** for quick lookup
- Check **[14-troubleshooting-guide.md](./14-troubleshooting-guide.md)** for common issues
- Set up your development environment
- Practice using these tools

---

**Last Updated:** January 2025

