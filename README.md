**GoDark DEX Plan**

## Quick Start

# Quick Start Guide

This is a condensed quick reference. For detailed instructions, see [ONBOARDING.md](./ONBOARDING.md).

## Prerequisites Checklist

- [ ] Rust (stable)
- [ ] Solana CLI (v3.0.11+)
- [ ] Anchor CLI (v0.32.1)
- [ ] Docker Desktop
- [ ] nektos-act (v0.2.80+)

## Installation Commands

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Anchor CLI
cargo install --git https://github.com/solana-foundation/anchor avm --force
avm install 0.32.1
avm use 0.32.1

# nektos-act (macOS)
brew install act

# Docker
# Download from docker.com or install via package manager
```

## Running Tests Locally

```bash
# 1. Start validator (Terminal 1)
solana-test-validator --reset

## Running CI Locally

```bash
# From gdx directory
gdx/devops/run-local-ci-collateral-vault.sh
gdx/devops/run-local-ci-ephemeral-vault.sh
gdx/devops/run-local-ci-funding-rate.sh
gdx/devops/run-local-ci-liquidation-engine.sh
gdx/devops/run-local-ci-oracle.sh
gdx/devops/run-local-ci-position-mgmt.sh
gdx/devops/run-local-ci-settlement-relayer.sh
```

## Golden Image

The CI uses a pre-built Docker image: `ghcr.io/gq-godark/gdx-golden-image:latest`

This image is publicly available and includes:
- Rust toolchain (stable)
- Pre-configured environment
- Faster CI runs (~6-12 minutes saved)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `anchor: command not found` | `avm use 0.32.1` |
| Port 8899 in use | `pkill -9 -f solana-test-validator` |
| Docker not running | Start Docker Desktop |
| Tests can't find config.json | Generate it: `PROGRAM_ID=$(solana address -k target/deploy/<program>-keypair.json) && echo '{"program_id":"'$PROGRAM_ID'","rpc_url":"http://127.0.0.1:8899"}' > config.json` |

## Project Structure

```
gdx/
├── gdx-collateral-vault/
├── gdx-liquidation-engine/
├── gdx-oracle/
├── gdx-position-mgmt/
├── gdx-funding-rate/
└── devops/
    └── run-local-ci-*.sh
```


## Setup


### Installation

#### 1. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

After installation, add Solana to your PATH (if not already added automatically):

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Verify installation:

```bash
solana --version
# Should output: solana-cli 3.0.11 (or newer)
```

#### 2. Install Anchor CLI

Install Anchor Version Manager (AVM):

```bash
cargo install --git https://github.com/solana-foundation/anchor avm --force
```

Install and use the latest Anchor version:

```bash
avm install latest
avm use latest
```

Verify installation:

```bash
anchor --version
# Should output: anchor-cli 0.32.1 (or newer)
```

#### 3. Configure Solana CLI

Set up your Solana configuration for local development:

```bash
solana config set --url localhost
solana-keygen new --outfile ~/.config/solana/id.json
```

#### 4. Project Setup

Clone the repository and navigate to a project:

```bash
cd gdx-collateral-vault/collateral-vault
```

Build the program:

```bash
anchor build
```

Run tests:

```bash
anchor test
# Or for Rust integration tests:
cargo test --manifest-path=./tests/Cargo.toml --test integration_test
```

#### 5. Start Local Validator

In a separate terminal, start the Solana test validator:

```bash
solana-test-validator
```

Keep this running while developing and testing.

### Current Versions

- **Solana CLI**: 3.0.11
- **Anchor CLI**: 0.32.1
- **Rust**: 1.84.1 (via Solana platform tools)

---

## Local CI Testing with nektos-act

Run GitHub Actions CI pipelines locally using [nektos-act](https://github.com/nektos/act) before pushing to GitHub.

### Quick Start

From the `gdx` directory:

```bash
# Verify setup
./test-act-setup.sh

# Run collateral-vault CI pipeline
./run-act-collateral-vault.sh
```

### Prerequisites

1. **Install nektos-act**:
   ```bash
   # macOS
   brew install act
   
   # Linux
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

2. **Install Docker**: Ensure Docker Desktop/Engine is running

3. **Verify installations**:
   ```bash
   act --version
   docker --version
   ```

### How It Works

- **Configuration**: `.actrc` specifies the Docker image to use
- **Scripts**: 
  - `run-act-collateral-vault.sh` - Runs the collateral-vault CI pipeline
  - `test-act-setup.sh` - Verifies act and Docker setup
- **Workflow**: Targets `gdx-collateral-vault/.github/workflows/ci.yml`
- **Background processes**: The `solana-test-validator` runs in the background and persists across workflow steps using `nohup`

### Key Features

- ✅ Runs the exact same workflow steps as GitHub Actions
- ✅ Background validator process persists across steps
- ✅ Host networking for validator port binding
- ✅ Verbose output for debugging

### Troubleshooting

- **Validator not starting**: Check port 8899 availability (`lsof -i :8899`)
- **Network issues**: On macOS/Windows Docker Desktop, `--network=host` may not work
- **Container image**: Act will automatically pull the image on first run (configured in `.actrc`)

### Faster Local Runs with Prebaked Image

To speed up local CI runs, you can build a Docker image with dependencies pre-installed:

```bash
# Build the prebaked image (takes 10-15 minutes first time)
./build-ci-image.sh

# Switch to using the prebaked image
./use-ci-image.sh

# Now run CI - faster!
./run-act-collateral-vault.sh
```

**Prebaked image includes:**
- ✅ Rust toolchain (stable) with rustfmt and clippy - **Pre-installed**
- ⚠️ Solana CLI (v1.18.20) - Installed by workflow (handles network issues)
- ⚠️ Anchor CLI (v0.32.1) - Installed by workflow (handles versioning)

**Time savings**: ~6-12 minutes per run by skipping Rust installation steps.

**Status**: ✅ Image built and validated (2.85GB, ready to use)

For more details, see the workflow file: `gdx-collateral-vault/.github/workflows/ci.yml`

---

**Summary**:  
GoDark is a crypto dark pool decentralized exchange (DEX) that runs on the Solana blockchain. GoDark is designed to reduce market impact of all trade sizes and maintain absolute privacy.

**Function**:

* Blockchain:   
  * Layer 2 (L1 is Solana)  
  * Single-chain solution  
* Instruments:   
  * Symbol format:  
    * Base-Quote-Type (i.e. BTC-USDT-PERP)  
  * Only the following quote asset should be included:  
    * USDT  
  * The following base assets should be included:  
    * Top 50 crypto assets  
      1. BTC  
      2. ETH  
      3. BNB  
      4. XRP  
      5. SOL  
      6. USDC  
      7. TRX  
      8. DOGE  
      9. ADA  
      10. HYPE  
      11. LINK  
      12. ESDe  
      13. XLM  
      14. BCH  
      15. SUI  
      16. LEO  
      17. AVAX  
      18. LTC  
      19. HBAR  
      20. SHIB  
      21. XMR  
      22. DAI  
      23. TON  
      24. MNT  
      25. CRO  
      26. DOT  
      27. ZEC  
      28. TAO  
      29. UNI  
      30. OKB  
      31. AAVE  
      32. BGB  
      33. ENA  
      34. WLFI  
      35. PEPE  
      36. PYUSD  
      37. NEAR  
      38. ETC  
      39. USD1  
      40. APT  
      41. M  
      42. ONDO  
      43. POL  
      44. ASTER  
      45. WLD  
      46. KCS  
      47. IP  
      48. ARB  
      49. PI  
      50. ICP  
    * FX pairs as base assets, such as:  
      1. USD  
      2. GBP  
      3. EUR  
      4. JPY  
      5. CHF  
      6. AUD  
      7. CAD  
      8. CNY  
      9. HKD  
      10. SGD  
* Order Matching:   
  * Submitted via UI/API/WS, not onchain  
  * Processed off-chain using GoDark matching engine  
* Funding Rate Mechanism:  
  * Calculated every 1 second  
  * Paid every 1 hour  
  * Calculated using a VWAP pricing oracle from consolidated price feed  
* Leverage  
  * Up to 1,000x leverage  
  * Isolated margin only  
  * Liquidation engine to monitor order status (filled, exited, etc.), spot price via price oracle  
* Settlement:   
  * All transactions are on a per-trade basis  
  * Settlement relayer batch smart contract  
  * Ephemeral (temporary, unlinked) wallets   
  * Fees (USDT only) sent to GoDark fee wallet at settlement  
* Order Types:  
  * Market  
  * Limit  
  * Peg to Mid/Bid/Ask  
* Time in Force:  
  * Immediate or Cancel  
  * Fill or Kill  
  * Good Till Date  
  * Good Till Cancel  
* Order Attributes:  
  * All or None  
  * Min Qty  
  * NBBO Protection  
  * Visibility (dark only, no lit)  
* Create Account Flow:  
  * Add wallet  
  * Create account with email and password  
  * Confirm email, configure optional 2FA  
  * Trade

**UI Elements**:

* Backend:  
  * X  
* Menu Items:  
  * Trade (main page on app.godark.xyz)  
  * Stats (simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on [app.godark.xyz](http://app.godark.xyz))  
  * Referrals (simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on [app.godark.xyz](http://app.godark.xyz))	  
  * Docs (separate page on [app.godark.xyz](http://app.godark.xyz))  
  * Settings Icon (Icon on right side with simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on [app.godark.xyz](http://app.godark.xyz))  
* Components:  
  * Trade (main page on app.godark.xyz)  
    * Funding rate stats and countdown at header  
    * Order form  
    * Chart with symbol selector showing Hyperliquid prices and orderbook  
  * Trade Table Columns:  
    * **Working Orders**  
      * Algorithm ID  
      * Date  
        Time  
      * Type (algo type)  
      * Symbol  
      * Side  
      * Avg Fill Price  
        Avg Order Price  
      * Fill Quantity  
        Order Quantity  
      * Fill Value  
        Order Value  
      * Fill Progress  
      * Status  
      * Actions  
    * **Order History**  
      * Algorithm ID  
      * Date  
        Time  
      * Type (algo type)  
      * Symbol  
      * Side  
      * Avg Fill Price  
        Avg Order Price  
      * Fill Quantity  
        Order Quantity  
      * Fill Value  
        Order Value  
      * Fill Progress  
      * Status  
      * Actions  
          
    * **Open Positions**  
      * Symbol (should be like pic, if long green, if short red and have leverage refer to hyperliquid)  
      * Size (should be colour of direction)  
      * Position Value (USDT)  
      * Margin (In dollars and brackets at end saying cross/isolated)  
      * Realized PNL  
      * Nurealized PNL  
      * Entry Price  
      * Mark Price  
      * Funding

    

  * Stats (on [stats.godark.xyz](http://stats.godark.xyz))  
    * Three different sections (all metrics published at midnight UTC from two days before, so if it’s Saturday midnight UTC, we would display all of Thursday’s data):  
      * Execution Quality & Savings (in aggregate)  
        * Cumulative chart of daily values  
        * Numerical value of the most recent day  
        * Metrics to filter in chart:  
          * Slippage and Market Impact Saved (USDT)  
          * MEV Avoided (USDT)  
      * GoDark Market Data (in aggregate)  
        * Cumulative chart of daily values  
        * Numerical value of the most recent day  
        * Metrics to filter in chart:  
          * Matched Volume (USDT)  
          * Liquidity Submitted (USDT)  
          * Buy / Sell Ratio (%)  
          * Avg Time to Fill (Sec)  
          * Avg Trade Size (USDT)  
          * Avg Order Size (USDT)  
          * Matched Trade Count (\#)  
          * Order Count (\#)  
      * Operational Transparency (in aggregate)  
        * Cumulative chart of daily values  
        * Numerical value of the most recent day  
        * Metrics to filter in chart:  
          * Fees Collected (USDT)  
          * Avg Settlement Finality Time (Sec)  
          * Failed Settlements (\#)  
          * System Downtime (Min)  
          * Avg API Response Time (Sec)  
  * Admin (on app.godark.xyz)  
    * Linked Wallet  
      * Linked wallet address with link/unlink option (one wallet only per account)  
    * API Key Management  
      * Display table of current keys, with edit/delete functions  
        * Key Name (editable)  
        * API Key (not editable)  
        * Secret Key (not editable)  
        * Passphrase (not editable)  
        * IP Whitelist (editable)  
      * Option to add additional key  
    * Account Management  
      * Email, password, 2FA authenticator app (optional) settings  
      * Delete account option  
    * Activity  
      * Last login (device and IP)  
  * Docs (on [docs.godark.xyz](http://docs.godark.xyz))  
    * Separate docs page  
* Basic Interface Mode:  
  * Replace candlestick chart with area line chart  
  * Remove last trades feed and orderbook feed  
  * Keep bottom section of working orders, order history, open positions, wallet holdings  
  * Move best bid, bid, and ask on top of the chart  where the funding rates are  
  * Order form options:  
    * Market and limit orders only  
    * Quick leverage selector: 1x, 10x, 100x, 100x  
    * Quantity slider  
    * GTC only  
    * Add TP/SL option  
    * No other order attributes (i.e. remove NBBO, Min Qty, etc.)  
  * Keep account metrics  
* IP Restrictions:  
  * North America:  
    * US  
    * Canada (Quebec and Ontario only)  
  * Central and South America:  
    * Bolivia  
    * Ecuador  
    * Cuba  
  * Europe:  
    * United Kingdom  
    * France  
    * Belarus  
    * Russia  
    * Ukraine  
    * Crimea, Donetsk, Luhansk  
  * Asia:  
    * China (mainland)  
    * North Korea  
    * Iran  
    * Iraq  
    * Syria  
    * Bangladesh  
    * Myanmar  
    * Nepal  
  * Africa:  
    * Algeria  
    * Morocco  
    * Egypt

**Settlements:**  
	**Wallet Connection:**

1. Connect/Create Wallet and Approve  
   1. Wallet UI  
   2. User connects Phantom/Trust/Solflare or creates wallet and signs one approval giving the GoDark program delegate rights to spend up to X USDT  
2. Vault Creation  
   1. Smart Contract  
   2. Program deterministically creates a PDA (ephemeral vault) for that user (e.g. seed \= \[user address, timestamp\]). No keys; program-owned.  
3. Deposit/Withdraw  
   1. Contract Delegate  
   2. Program automatically pulls approved USDT from user wallet into PDA when trading starts.  
4. Trading Cycle  
   1. Off-chain Engine  
   2. Trades execute off-chain in 1-second windows; engine computes each user’s net ΔUSDT.  
5. Batch Settlement  
   1. Contract Program  
   2. Every 1 s, contract moves net ΔUSDT between PDAs; updates on-chain ledger / Merkle root.  
6. Vault Cleanup  
   1. Contract Program  
   2. PDA closed; any unused margin returned to user ATA; rent refunded.  
7. Withdraw/Revoke  
   1. Wallet UI  
   2. User can withdraw unlocked margin anytime or revoke approval to halt contract access.

	**UX Summary**:

* Connect Wallet  
  * Options to Connect Existing Wallet:  
    * Phantom  
    * Trust  
    * Solflare  
  * Options to Create New Wallet  
    * Sign in with Google/Apple/X/Discord  
    * Insert Email Address  
* Authorize GoDark  
  * “Authorize X (user input field) USDT for trading”  
* Withdraw  
  * “Withdraw Unlocked Balance”  
  * One click, no signature required  
* Revoke  
  * “Revoke Wallet Access”

	**Settlement Flow:**  
	

**Token:**

* Utilities:  
  * Staking Yield (via x% of revenue being allocated to token holders)  
  * Rebate for reduced fees  
  * Airdrops  
  * Burn-and-buyback  
  * Bug bounties  
* Allocation  
  * Foundation  
  * GoQuant  
  * Team  
  * Incentives  
  * Community  
* Similar tokens:  
  * HYPE, ASTER, Raydium, Manta, Jupiter, PUMP

**Inspiration**

* Humidifi  
  * Solana AMM, dark pool privacy  
  * Jupiter routes 50% volume through them  
  * Shows Solana’s market is shifting towards dark pools  
* Manta  
  * ETH L2, focus on privacy  
  * Evolving from Bybit's early backing of Mantle's predecessor (BitDAO)  
  * Utilities:   
    * Staking, fee payments and rebates, governance (limited),   
  * Utilities on Bybit:   
    * Holders get fee discounts, extended loan terms, and use MNT as collateral in lending/staking pools