# Testing Strategies for GoDark DEX

## Overview

Comprehensive testing is critical for financial applications handling user funds. This guide covers testing strategies, patterns, and best practices for Solana/Anchor programs and Rust backend services.

---

## Testing Pyramid

```
        /\
       /  \
      / E2E \          Few, slow, expensive
     /--------\
    /          \
   / Integration \     Some, medium speed
  /--------------\
 /                \
/   Unit Tests     \   Many, fast, cheap
/------------------\
```

**GoDark Testing Strategy:**
- **Unit Tests**: 70% - Fast, isolated component tests
- **Integration Tests**: 25% - Component interaction tests
- **E2E Tests**: 5% - Full system tests

---

## Anchor Test Framework Setup

### Initial Setup

**Install Dependencies:**
```bash
yarn add @coral-xyz/anchor @solana/web3.js @solana/spl-token chai mocha
```

**Test Configuration (`tests/your-component.ts`):**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { YourComponent } from "../target/types/your_component";
import { assert } from "chai";

describe("your-component", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.YourComponent as Program<YourComponent>;
  
  // Test accounts
  const user = anchor.web3.Keypair.generate();
  
  before(async () => {
    // Airdrop SOL for testing
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
  });
});
```

### Running Tests

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/your-component.ts

# Run with verbose output
anchor test -- --verbose

# Run with coverage (if configured)
anchor test -- --coverage
```

---

## Unit Testing Patterns

### Instruction Testing

**Test Instruction Execution:**
```typescript
it("Initializes position correctly", async () => {
  const positionPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), user.publicKey.toBuffer()],
    program.programId
  )[0];

  await program.methods
    .initializePosition(new anchor.BN(1000), 10)
    .accounts({
      position: positionPDA,
      user: user.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([user])
    .rpc();

  const position = await program.account.position.fetch(positionPDA);
  assert.equal(position.size.toNumber(), 1000);
  assert.equal(position.leverage, 10);
});
```

### Account Validation Testing

**Test Account Constraints:**
```typescript
it("Fails with invalid authority", async () => {
  const invalidUser = anchor.web3.Keypair.generate();
  
  try {
    await program.methods
      .closePosition()
      .accounts({
        position: positionPDA,
        authority: invalidUser.publicKey, // Wrong authority
      })
      .signers([invalidUser])
      .rpc();
    
    assert.fail("Should have failed");
  } catch (err) {
    assert.include(err.message, "InvalidAuthority");
  }
});
```

### Error Testing

**Test Error Conditions:**
```typescript
it("Fails with insufficient collateral", async () => {
  try {
    await program.methods
      .openPosition(new anchor.BN(10000), 100) // Requires 1000 collateral
      .accounts({
        user: user.publicKey,
        // ... other accounts
      })
      .rpc();
    
    assert.fail("Should have failed");
  } catch (err) {
    assert.include(err.message, "InsufficientCollateral");
  }
});
```

### Edge Case Testing

**Test Boundary Conditions:**
```typescript
it("Handles maximum leverage correctly", async () => {
  // Test with 1000x leverage (maximum)
  await program.methods
    .openPosition(new anchor.BN(1000), 1000)
    .accounts({
      // ... accounts
    })
    .rpc();
  
  const position = await program.account.position.fetch(positionPDA);
  assert.equal(position.leverage, 1000);
});

it("Handles minimum position size", async () => {
  // Test with minimum position size
  await program.methods
    .openPosition(new anchor.BN(1), 1)
    .accounts({
      // ... accounts
    })
    .rpc();
});
```

---

## Integration Testing

### Multi-Instruction Flows

**Test Complete Workflows:**
```typescript
it("Complete position lifecycle", async () => {
  // 1. Initialize
  await program.methods.initializePosition(1000, 10).rpc();
  
  // 2. Modify position
  await program.methods.addCollateral(new anchor.BN(500)).rpc();
  
  // 3. Close position
  await program.methods.closePosition().rpc();
  
  // Verify final state
  const position = await program.account.position.fetchNullable(positionPDA);
  assert.isNull(position); // Position should be closed
});
```

### CPI Testing

**Test Cross-Program Invocations:**
```typescript
it("Transfers tokens via CPI", async () => {
  const fromTokenAccount = await getAssociatedTokenAddress(mint, user.publicKey);
  const toTokenAccount = await getAssociatedTokenAddress(mint, vaultPDA, true);
  
  const balanceBefore = await getAccount(provider.connection, toTokenAccount);
  
  await program.methods
    .depositCollateral(new anchor.BN(1000))
    .accounts({
      from: fromTokenAccount,
      to: toTokenAccount,
      // ... other accounts
    })
    .rpc();
  
  const balanceAfter = await getAccount(provider.connection, toTokenAccount);
  assert.equal(
    balanceAfter.amount - balanceBefore.amount,
    BigInt(1000)
  );
});
```

### Mock External Programs

**Mock Oracle for Testing:**
```typescript
// Create mock oracle account
const mockOracle = anchor.web3.Keypair.generate();
const oracleData = {
  price: new anchor.BN(50000),
  confidence: new anchor.BN(100),
  timestamp: new anchor.BN(Date.now() / 1000),
};

// Use mock oracle in tests
await program.methods
  .updateMarkPrice()
  .accounts({
    oracle: mockOracle.publicKey,
  })
  .rpc();
```

---

## On-Chain Testing

### Localnet Deployment

**Deploy to Local Validator:**
```typescript
before(async () => {
  // Start local validator (in separate terminal)
  // solana-test-validator
  
  // Deploy program
  await program.provider.connection.confirmTransaction(
    await program.provider.connection.requestAirdrop(
      program.provider.wallet.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    ),
    "confirmed"
  );
  
  await program.program.methods
    .initialize()
    .rpc();
});
```

### Transaction Simulation

**Simulate Transactions:**
```typescript
it("Simulates transaction without executing", async () => {
  const tx = await program.methods
    .openPosition(1000, 10)
    .accounts({
      // ... accounts
    })
    .transaction();
  
  const simulation = await program.provider.connection.simulateTransaction(tx);
  
  assert.isTrue(simulation.value.err === null);
  assert.isAbove(simulation.value.logs.length, 0);
});
```

---

## Rust Backend Testing

### Unit Tests

**Test Business Logic:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_margin_calculation() {
        let collateral = 1000u64;
        let leverage = 10u8;
        let initial_margin = calculate_initial_margin(collateral, leverage);
        
        assert_eq!(initial_margin, 10000);
    }
    
    #[test]
    fn test_margin_ratio() {
        let collateral = 1000u64;
        let unrealized_pnl = 500i64;
        let maintenance_margin = 500u64;
        
        let ratio = calculate_margin_ratio(collateral, unrealized_pnl, maintenance_margin);
        
        assert_eq!(ratio, 3.0); // (1000 + 500) / 500
    }
}
```

### Integration Tests

**Test API Endpoints:**
```rust
#[tokio::test]
async fn test_create_position() {
    let app = create_test_app().await;
    
    let response = app
        .post("/api/positions")
        .json(&json!({
            "user": "User111111111111111111111111111111111",
            "size": 1000,
            "leverage": 10
        }))
        .send()
        .await
        .unwrap();
    
    assert_eq!(response.status(), 200);
    
    let position: Position = response.json().await.unwrap();
    assert_eq!(position.size, 1000);
}
```

### Database Tests

**Test Database Operations:**
```rust
#[tokio::test]
async fn test_create_proposal() {
    let db = setup_test_database().await;
    
    let proposal = UpgradeProposal {
        id: Uuid::new_v4(),
        proposal_id: "Proposal1111111111111111111111111111111".to_string(),
        // ... other fields
    };
    
    db.create_proposal(&proposal).await.unwrap();
    
    let fetched = db.get_proposal_by_id(&proposal.proposal_id).await.unwrap();
    assert_eq!(fetched.unwrap().proposal_id, proposal.proposal_id);
}
```

---

## Mocking Strategies

### Mock Oracles

**Mock Price Feed:**
```rust
pub struct MockOracle {
    pub price: u64,
    pub confidence: u64,
}

impl OracleClient for MockOracle {
    async fn get_price(&self, _symbol: &str) -> Result<PriceData> {
        Ok(PriceData {
            price: self.price,
            confidence: self.confidence,
            timestamp: Utc::now(),
        })
    }
}
```

### Mock External Programs

**Mock SPL Token Program:**
```typescript
// Create mock token account
const mockTokenAccount = {
  mint: mint.publicKey,
  owner: user.publicKey,
  amount: new anchor.BN(10000),
};

// Use in tests
await program.methods
  .transferTokens(new anchor.BN(1000))
  .accounts({
    tokenAccount: mockTokenAccount,
    // ... other accounts
  })
  .rpc();
```

---

## Edge Case Testing

### Overflow/Underflow

**Test Integer Overflow:**
```rust
#[test]
#[should_panic(expected = "overflow")]
fn test_overflow() {
    let max: u64 = u64::MAX;
    let result = max + 1; // Should panic
}

#[test]
fn test_checked_math() {
    let a = u64::MAX;
    let b = 1u64;
    
    // Use checked math
    match a.checked_add(b) {
        Some(result) => panic!("Should overflow"),
        None => {} // Expected
    }
}
```

### Boundary Conditions

**Test Boundary Values:**
```typescript
it("Handles maximum leverage", async () => {
  await program.methods
    .openPosition(1000, 1000) // Max leverage
    .rpc();
});

it("Handles minimum position size", async () => {
  await program.methods
    .openPosition(1, 1) // Minimum
    .rpc();
});

it("Fails with leverage > 1000", async () => {
  try {
    await program.methods
      .openPosition(1000, 1001) // Too high
      .rpc();
    assert.fail("Should fail");
  } catch (err) {
    assert.include(err.message, "InvalidLeverage");
  }
});
```

---

## Security Testing

### Authorization Testing

**Test Authority Checks:**
```typescript
it("Prevents unauthorized access", async () => {
  const attacker = anchor.web3.Keypair.generate();
  
  try {
    await program.methods
      .closePosition()
      .accounts({
        position: positionPDA,
        authority: attacker.publicKey, // Not authorized
      })
      .signers([attacker])
      .rpc();
    
    assert.fail("Should have failed");
  } catch (err) {
    assert.include(err.message, "Unauthorized");
  }
});
```

### Input Validation Testing

**Test Invalid Inputs:**
```typescript
it("Rejects invalid inputs", async () => {
  // Test negative values
  try {
    await program.methods
      .openPosition(new anchor.BN(-1000), 10)
      .rpc();
    assert.fail("Should fail");
  } catch (err) {
    assert.include(err.message, "InvalidInput");
  }
  
  // Test zero values
  try {
    await program.methods
      .openPosition(new anchor.BN(0), 10)
      .rpc();
    assert.fail("Should fail");
  } catch (err) {
    assert.include(err.message, "InvalidInput");
  }
});
```

### Attack Vector Testing

**Test Reentrancy Prevention:**
```rust
#[test]
fn test_no_reentrancy() {
    // Test that functions cannot be called recursively
    // Anchor programs are single-threaded, but test CPI reentrancy
}
```

**Test Manipulation Attempts:**
```typescript
it("Prevents oracle manipulation", async () => {
  // Try to use stale oracle price
  const staleOracle = createStaleOracle();
  
  try {
    await program.methods
      .updateMarkPrice()
      .accounts({
        oracle: staleOracle.publicKey,
      })
      .rpc();
    
    assert.fail("Should reject stale price");
  } catch (err) {
    assert.include(err.message, "StalePrice");
  }
});
```

---

## Performance Testing

### Compute Unit Testing

**Test Compute Usage:**
```typescript
it("Stays within compute budget", async () => {
  const tx = await program.methods
    .batchSettle(100) // Process 100 trades
    .transaction();
  
  const simulation = await program.provider.connection.simulateTransaction(tx);
  
  assert.isBelow(
    simulation.value.unitsConsumed || 0,
    400000 // Compute budget limit
  );
});
```

### Transaction Size Testing

**Test Transaction Size:**
```typescript
it("Transaction fits within size limit", async () => {
  const tx = await program.methods
    .batchSettle(50) // Batch size
    .transaction();
  
  const serialized = tx.serialize();
  assert.isBelow(serialized.length, 1232); // Max transaction size
});
```

### Load Testing

**Test High Throughput:**
```rust
#[tokio::test]
async fn test_high_throughput() {
    let app = create_test_app().await;
    
    // Create 1000 concurrent requests
    let mut handles = Vec::new();
    for i in 0..1000 {
        let app_clone = app.clone();
        handles.push(tokio::spawn(async move {
            app_clone
                .post("/api/positions")
                .json(&json!({"id": i}))
                .send()
                .await
        }));
    }
    
    let results = futures::future::join_all(handles).await;
    let successes = results.iter().filter(|r| r.is_ok()).count();
    
    assert!(successes > 950); // 95% success rate
}
```

---

## Test Data Management

### Test Fixtures

**Create Reusable Test Data:**
```typescript
export function createTestUser(): anchor.web3.Keypair {
  return anchor.web3.Keypair.generate();
}

export function createTestPosition(user: anchor.web3.PublicKey) {
  return {
    user: user,
    size: new anchor.BN(1000),
    leverage: 10,
    entryPrice: new anchor.BN(50000),
  };
}
```

### Test Database Setup

**Setup Test Database:**
```rust
async fn setup_test_database() -> Arc<Database> {
    let database_url = "postgresql://postgres:postgres@localhost/godark_test";
    let pool = PgPool::connect(&database_url).await.unwrap();
    
    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    
    Arc::new(Database { pool: Arc::new(pool) })
}

#[tokio::test]
async fn test_with_clean_database() {
    let db = setup_test_database().await;
    // Test code
    // Database is cleaned after test
}
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install Solana
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
      
      - name: Install Anchor
        run: |
          cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
          avm install latest
          avm use latest
      
      - name: Run Anchor Tests
        run: anchor test
      
      - name: Run Rust Tests
        run: cargo test
```

---

## Coverage Goals and Metrics

### Coverage Targets

- **Unit Tests**: >80% line coverage
- **Integration Tests**: >60% integration coverage
- **Critical Paths**: 100% coverage

### Coverage Tools

**Rust Coverage:**
```bash
# Install cargo-tarpaulin
cargo install cargo-tarpaulin

# Generate coverage
cargo tarpaulin --out Html
```

**TypeScript Coverage:**
```bash
# Install nyc
npm install --save-dev nyc

# Run with coverage
nyc anchor test
```

---

## Key Takeaways

1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Test Everything**: Functionality, errors, edge cases
3. **Mock External**: Mock oracles, external programs
4. **Security Tests**: Authorization, input validation, attacks
5. **Performance Tests**: Compute units, transaction size, throughput
6. **CI/CD**: Automate testing in pipeline
7. **Coverage**: Aim for >80% coverage

---

## Next Steps

- Review **[08-common-patterns-pitfalls.md](./08-common-patterns-pitfalls.md)** for testing patterns
- Check **[09-security-best-practices.md](./09-security-best-practices.md)** for security testing
- Practice writing tests for your component

---

**Last Updated:** January 2025

