# Development Workflow for GoDark DEX

## Overview

This guide covers day-to-day development practices, tools, and workflows for building GoDark DEX components. Follow these practices to ensure code quality, consistency, and efficient collaboration.

---

## Local Development Setup

### Prerequisites

**Required Software:**
1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update stable
   ```

2. **Solana CLI** (latest)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   solana --version
   ```

3. **Anchor Framework**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   anchor --version
   ```

4. **PostgreSQL** (for backend services)
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   ```

5. **Node.js & Yarn** (for Anchor tests)
   ```bash
   # Install Node.js (v18+)
   # Install Yarn
   npm install -g yarn
   ```

### Environment Setup

**Solana Configuration:**
```bash
# Set to localnet for development
solana config set --url localhost

# Generate keypair if needed
solana-keygen new

# Airdrop SOL for testing
solana airdrop 10
```

**Environment Variables:**
```bash
# .env file
SOLANA_RPC_URL=http://localhost:8899
DATABASE_URL=postgresql://postgres:postgres@localhost/godark_dev
ANCHOR_PROVIDER_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json
```

---

## Project Structure Conventions

### Anchor Program Structure

```
your-component/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Workspace Cargo.toml
├── programs/
│   └── your-component/
│       ├── src/
│       │   └── lib.rs       # Main program file
│       └── Cargo.toml       # Program dependencies
├── tests/
│   └── your-component.ts    # Anchor tests
└── migrations/              # Database migrations (if applicable)
```

### Rust Backend Service Structure

```
your-service/
├── Cargo.toml               # Service dependencies
├── src/
│   ├── main.rs             # Service entry point
│   ├── lib.rs              # Library root
│   ├── error.rs            # Error types
│   ├── database.rs         # Database operations
│   ├── api.rs              # REST API
│   └── websocket.rs        # WebSocket handlers
├── migrations/
│   └── 001_initial_schema.sql
└── README.md
```

### Naming Conventions

- **Files**: `snake_case.rs` (Rust), `kebab-case.ts` (TypeScript)
- **Modules**: `snake_case`
- **Structs**: `PascalCase`
- **Functions**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

---

## Anchor Project Initialization

### Create New Anchor Project

```bash
anchor init your-component
cd your-component
```

### Configure Anchor.toml

```toml
[features]
resolution = true
skip-lint = false

[programs.localnet]
your_component = "YourProgram111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Build Process

```bash
# Build program
anchor build

# Build and deploy to localnet
anchor build
anchor deploy

# Generate IDL
anchor idl parse -f programs/your-component/src/lib.rs -o target/idl/your_component.json
```

---

## Testing Workflow

### Anchor Tests (TypeScript)

**Test Structure:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { YourComponent } from "../target/types/your_component";

describe("your-component", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.YourComponent as Program<YourComponent>;
  
  it("Initializes correctly", async () => {
    // Test code
  });
});
```

**Running Tests:**
```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/your-component.ts

# Run with verbose output
anchor test -- --verbose
```

### Rust Unit Tests

**Test Structure:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculation() {
        // Test code
    }
}
```

**Running Tests:**
```bash
# Run all tests
cargo test

# Run specific test
cargo test test_calculation

# Run with output
cargo test -- --nocapture
```

### Integration Tests

**Backend Service Tests:**
```rust
#[tokio::test]
async fn test_api_endpoint() {
    // Test API endpoints
}
```

**Running Integration Tests:**
```bash
cargo test --test integration_test
```

---

## Deployment Process

### Localnet Deployment

```bash
# Start local validator
solana-test-validator

# In another terminal, deploy
anchor build
anchor deploy

# Verify deployment
solana program show YourProgram111111111111111111111111111
```

### Devnet Deployment

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop SOL
solana airdrop 2

# Deploy
anchor build
anchor deploy --provider.cluster devnet

# Verify
solana program show YourProgram111111111111111111111111111 --url devnet
```

### Mainnet Deployment

**⚠️ Production Deployment Checklist:**
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Rollback plan prepared

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy (use upgrade authority)
anchor deploy --provider.cluster mainnet-beta
```

---

## Debugging Techniques

### Anchor Program Debugging

**1. Program Logs:**
```rust
msg!("Debug: value = {}", value);
```

**View Logs:**
```bash
solana logs
```

**2. Account Inspection:**
```bash
# View account data
solana account YourAccount111111111111111111111111111

# Decode account data
anchor account YourAccount --program-id YourProgram111111111111111111111111111
```

**3. Transaction Inspection:**
```bash
# View transaction
solana confirm <signature>

# Decode transaction
solana confirm <signature> --verbose
```

### Rust Backend Debugging

**1. Logging:**
```rust
use tracing::{info, error, debug, warn};

info!("Processing trade: {:?}", trade);
error!("Failed to process: {}", error);
debug!("Debug info: {:?}", data);
```

**2. Database Debugging:**
```bash
# Connect to database
psql -d godark_dev

# Query tables
SELECT * FROM positions LIMIT 10;
```

**3. API Debugging:**
```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Common Debugging Tools

- **Solana Explorer**: https://explorer.solana.com/
- **Solscan**: https://solscan.io/
- **Anchor IDL Viewer**: View program interface
- **Transaction Decoders**: Decode transaction data

---

## Version Control Practices

### OneFlow Branching Strategy

GoDark uses **OneFlow** branching strategy for a simple, efficient git workflow.

**Reference:** [OneFlow: A Simple Git Repository Strategy](https://medium.com/better-programming/a-simple-git-repository-strategy-93a0c7450f23)

#### Branch Types

**1. Main Branch (`main`)**
- Single long-lived branch
- Always in deployable state
- All tests passing
- Production-ready code

**2. Feature Branches (`feature/XYZ-1234`)**
- Short-lived branches for new features
- Branch from `main`
- Merge back to `main` when complete
- Naming: `feature/component-name-description`

**Example:**
```bash
git checkout -b feature/position-management-margin-calc
# ... make changes ...
git commit -m "Add margin calculation logic"
git push origin feature/position-management-margin-calc
# Create PR to main
```

**3. Bugfix Branches (`bugfix/XYZ-1234`)**
- For non-critical bug fixes
- Branch from `main`
- Merge back to `main` when fixed
- Naming: `bugfix/component-name-issue`

**Example:**
```bash
git checkout -b bugfix/liquidation-engine-priority-queue
# ... fix bug ...
git commit -m "Fix priority queue ordering"
git push origin bugfix/liquidation-engine-priority-queue
```

**4. Hotfix Branches (`hotfix/XYZ-1234`)**
- For critical production issues
- Branch from latest tagged release
- Fix, test, tag, merge to `main`
- Naming: `hotfix/component-name-critical-issue`

**Example:**
```bash
git checkout -b hotfix/collateral-vault-security-patch v1.2.3
# ... fix critical issue ...
git commit -m "Security patch: Fix authorization check"
git tag v1.2.4
git push origin hotfix/collateral-vault-security-patch
git push origin v1.2.4
```

**5. Release Branches (`release/x.y.z`)**
- For preparing releases
- Branch from `main`
- Final testing and adjustments
- Tag and merge to `main`

**Example:**
```bash
git checkout -b release/1.3.0
# ... final testing ...
git commit -m "Release 1.3.0"
git tag v1.3.0
git push origin release/1.3.0
git push origin v1.3.0
```

#### Workflow Example

```
main (production-ready)
  │
  ├─→ feature/position-management (develop feature)
  │     │
  │     └─→ Merge to main when complete
  │
  ├─→ bugfix/liquidation-engine (fix bug)
  │     │
  │     └─→ Merge to main when fixed
  │
  └─→ release/1.3.0 (prepare release)
        │
        └─→ Tag and merge to main
```

#### Branch Naming Conventions

- **Feature**: `feature/component-name-description`
- **Bugfix**: `bugfix/component-name-issue`
- **Hotfix**: `hotfix/component-name-critical-issue`
- **Release**: `release/x.y.z`

**Examples:**
- `feature/settlement-relayer-batch-processing`
- `bugfix/funding-rate-calculation-error`
- `hotfix/collateral-vault-authorization-bug`
- `release/1.2.0`

#### Merge Workflow

**Pull Request Process:**
1. Create feature/bugfix branch
2. Make changes and commit
3. Push branch to remote
4. Create Pull Request to `main`
5. Code review
6. Address feedback
7. Merge to `main`
8. Delete branch

**Merge Commit Message:**
```
Merge feature/component-name-description

- Added feature X
- Fixed issue Y
- Updated documentation
```

---

## Code Review Guidelines

### Review Checklist

**Functionality:**
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] Performance acceptable

**Code Quality:**
- [ ] Follows Rust/TypeScript conventions
- [ ] No code duplication
- [ ] Clear variable/function names
- [ ] Adequate comments

**Security:**
- [ ] Authority checks present
- [ ] Input validation
- [ ] No overflow/underflow risks
- [ ] Secure key management

**Testing:**
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Edge cases tested
- [ ] Tests passing

**Documentation:**
- [ ] Code comments added
- [ ] README updated
- [ ] API docs updated (if applicable)

### Review Process

1. **Author**: Create PR with clear description
2. **Reviewer**: Review within 24 hours
3. **Feedback**: Provide constructive feedback
4. **Author**: Address feedback
5. **Approval**: At least 1 approval required
6. **Merge**: Squash and merge to `main`

---

## Documentation Standards

### Code Comments

**Rust:**
```rust
/// Calculates the margin ratio for a position.
///
/// # Arguments
/// * `collateral` - Current collateral amount
/// * `unrealized_pnl` - Unrealized profit/loss
/// * `maintenance_margin` - Required maintenance margin
///
/// # Returns
/// Margin ratio (collateral + pnl) / maintenance_margin
pub fn calculate_margin_ratio(
    collateral: u64,
    unrealized_pnl: i64,
    maintenance_margin: u64,
) -> Result<u64> {
    // Implementation
}
```

**TypeScript:**
```typescript
/**
 * Initializes a new position account.
 * @param user - User's public key
 * @param market - Market identifier
 * @param leverage - Leverage multiplier (1-1000)
 * @returns Position account public key
 */
async function initializePosition(
  user: PublicKey,
  market: PublicKey,
  leverage: number
): Promise<PublicKey> {
  // Implementation
}
```

### README Requirements

Each component should have a README.md with:
- Component overview
- Setup instructions
- Usage examples
- API documentation (if applicable)
- Testing instructions
- Deployment guide

---

## Common Development Pitfalls and Solutions

### Pitfall 1: Account Ownership Mistakes

**Problem:** Trying to modify account owned by wrong program

**Solution:**
```rust
// Always verify ownership
require!(
    account.owner == expected_program_id,
    ErrorCode::InvalidAccountOwner
);
```

### Pitfall 2: PDA Seed Mismatches

**Problem:** PDA derivation fails due to seed mismatch

**Solution:**
```rust
// Use constants for seeds
const SEED_VAULT: &[u8] = b"vault";

let (pda, bump) = Pubkey::find_program_address(
    &[SEED_VAULT, user_pubkey.as_ref()],
    program_id,
);
```

### Pitfall 3: Rent-Exempt Account Requirements

**Problem:** Account not rent-exempt, gets closed

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

### Pitfall 4: Compute Unit Exhaustion

**Problem:** Transaction fails due to compute limit

**Solution:**
```rust
// Set compute budget
use solana_program::compute_budget::ComputeBudgetInstruction;

let compute_budget = ComputeBudgetInstruction::set_compute_unit_limit(400_000);
instructions.push(compute_budget);
```

### Pitfall 5: Transaction Size Limits

**Problem:** Transaction too large (>1,232 bytes)

**Solution:**
- Batch operations into multiple transactions
- Reduce account data size
- Use compression techniques
- Optimize instruction data

### Pitfall 6: Missing Authority Checks

**Problem:** Anyone can call restricted instruction

**Solution:**
```rust
// Always check authority
require!(
    ctx.accounts.authority.key() == &expected_authority,
    ErrorCode::Unauthorized
);

// Or use Anchor's Signer constraint
#[account(signer)]
pub authority: Signer<'info>,
```

---

## Development Best Practices

### 1. Start Local, Test Thoroughly

- Always test on localnet first
- Verify all functionality
- Test edge cases
- Check error handling

### 2. Use Type Safety

- Leverage Rust's type system
- Use Anchor's type-safe wrappers
- Avoid `unwrap()` in production code
- Use `Result` types properly

### 3. Write Tests First (TDD)

- Write tests before implementation
- Test edge cases
- Test error conditions
- Aim for >80% coverage

### 4. Document As You Go

- Add comments for complex logic
- Document public APIs
- Update README with changes
- Keep docs in sync with code

### 5. Review Before Committing

- Review your own code
- Check for common mistakes
- Run linters/formatters
- Verify tests pass

---

## Key Takeaways

1. **Proper Setup**: Install all required tools before starting
2. **Consistent Structure**: Follow project structure conventions
3. **Test Thoroughly**: Write tests for all functionality
4. **OneFlow Strategy**: Use simple branching workflow
5. **Code Review**: Always get code reviewed
6. **Documentation**: Keep docs updated
7. **Debugging**: Use appropriate tools for each layer

---

## Next Steps

- Review **[07-testing-strategies.md](./07-testing-strategies.md)** for comprehensive testing guide
- Check **[08-common-patterns-pitfalls.md](./08-common-patterns-pitfalls.md)** for Solana patterns
- Study **[09-security-best-practices.md](./09-security-best-practices.md)** for security guidelines

---

**Last Updated:** January 2025

