## 10. Token Economics (DARK Token)

### Overview

The DARK token is the native utility token of the GoDark DEX ecosystem, designed to align incentives between the platform, traders, and token holders.

**Token Details:**
- Name: GoDark Token
- Symbol: DARK
- Blockchain: Solana (SPL Token)
- Total Supply: 1,000,000,000 DARK (fixed, no inflation)
- Decimals: 9

---

### Token Utilities

#### 1. Staking Yield (Revenue Share)

**Mechanism:**
```typescript
interface StakingTier {
    minStake: number;
    revenueSharePercent: number;
    lockPeriod: number; // days
    apr: number; // estimated
}

const STAKING_TIERS: StakingTier[] = [
    {
        minStake: 1000,
        revenueSharePercent: 5,
        lockPeriod: 0,    // Flexible
        apr: 8
    },
    {
        minStake: 10000,
        revenueSharePercent: 10,
        lockPeriod: 30,
        apr: 12
    },
    {
        minStake: 50000,
        revenueSharePercent: 15,
        lockPeriod: 90,
        apr: 18
    },
    {
        minStake: 100000,
        revenueSharePercent: 20,
        lockPeriod: 180,
        apr: 25
    }
];
```

**Revenue Distribution:**
```typescript
// Weekly revenue distribution
class RevenueDistribution {
    async distributeWeeklyRevenue(): Promise<void> {
        // 1. Calculate total fees collected
        const totalFees = await this.getTotalFeesCollected(7); // Last 7 days
        
        // 2. Get staker shares
        const stakersShare = totalFees * 0.40; // 40% to stakers
        
        // 3. Calculate each staker's portion
        const stakes = await this.getAllStakes();
        const totalStaked = stakes.reduce((sum, s) => sum + s.amount, 0);
        
        for (const stake of stakes) {
            const userShare = (stake.amount / totalStaked) * stakersShare;
            
            // 4. Distribute USDT rewards
            await this.distributeReward(stake.userId, userShare);
        }
        
        // 5. Record distribution
        await this.recordDistribution({
            totalFees,
            stakersShare,
            totalStaked,
            timestamp: Date.now()
        });
    }
}
```

#### 2. Fee Rebates and Discounts

**Fee Structure:**

| DARK Staked | Maker Fee | Taker Fee | Discount |
|-------------|-----------|-----------|----------|
| 0 | -0.02% | 0.05% | 0% |
| 1,000 - 9,999 | -0.02% | 0.0475% | 5% |
| 10,000 - 49,999 | -0.02% | 0.045% | 10% |
| 50,000 - 99,999 | -0.02% | 0.0425% | 15% |
| 100,000+ | -0.02% | 0.04% | 20% |

**Implementation:**
```typescript
async function calculateFee(
    userId: string,
    tradeSize: number,
    isMaker: boolean
): Promise<number> {
    const stakedAmount = await this.getStakedAmount(userId);
    const tier = this.getFeeT

ier(stakedAmount);
    
    const baseFee = isMaker ? tier.makerFee : tier.takerFee;
    const feeAmount = tradeSize * Math.abs(baseFee);
    
    return isMaker ? -feeAmount : feeAmount; // Negative for rebate
}
```

#### 3. Airdrops to Holders

**Airdrop Events:**
- Token launch airdrop to early users
- Monthly trading volume rewards
- Snapshot-based distributions for governance votes
- Partnership token airdrops (ecosystem tokens)

**Distribution Formula:**
```typescript
interface AirdropCalculation {
    userAllocation = (userTokens / totalCirculating) * totalAirdrop;
    
    // With minimum holding requirement
    if (holdingDuration < 30 days) {
        userAllocation *= 0.5; // 50% penalty
    }
    
    // With trading volume multiplier
    if (tradingVolume > threshold) {
        userAllocation *= (1 + tradingBonus);
    }
}
```

#### 4. Burn-and-Buyback Mechanism

**Burn Schedule:**
```typescript
class BurnMechanism {
    async executeBurnCycle(): Promise<void> {
        // Every month
        const feeRevenue = await this.getMonthlyFeeRevenue();
        const buybackAmount = feeRevenue * 0.30; // 30% for buyback
        
        // 1. Market buy DARK tokens
        const tokensBought = await this.marketBuyDARK(buybackAmount);
        
        // 2. Burn tokens (send to null address)
        await this.burnTokens(tokensBought);
        
        // 3. Update circulating supply
        await this.updateCirculatingSupply();
        
        // 4. Announce to community
        await this.announceBurn({
            amount: tokensBought,
            usdValue: buybackAmount,
            newCirculating: await this.getCirculatingSupply(),
            timestamp: Date.now()
        });
    }
}
```

**Burn Impact:**
```typescript
// Projected token burn over time
const BURN_PROJECTION = {
    year1: {
        estimatedFees: 50_000_000, // $50M
        buybackPercent: 0.30,
        buybackAmount: 15_000_000, // $15M
        estimatedBurn: 15_000_000, // 1.5% of supply
        newCirculating: 985_000_000
    },
    year5: {
        estimatedFees: 500_000_000,
        cumulativeBurn: 150_000_000, // 15% of supply
        newCirculating: 850_000_000
    }
};
```

#### 5. Bug Bounty Payments

Bug bounty rewards paid in DARK tokens:
- Critical: up to 1M DARK ($1M value)
- High: up to 100K DARK
- Medium: up to 10K DARK
- Low: up to 1K DARK

---

### Token Allocation

**Total Supply: 1,000,000,000 DARK**

```typescript
const TOKEN_ALLOCATION = {
    foundation: {
        amount: 200_000_000,      // 20%
        purpose: 'Protocol development, partnerships',
        vesting: 'Linear over 4 years',
        cliff: 'None'
    },
    goQuant: {
        amount: 150_000_000,      // 15%
        purpose: 'Strategic reserve for GoQuant',
        vesting: 'Linear over 4 years',
        cliff: '1 year'
    },
    team: {
        amount: 150_000_000,      // 15%
        purpose: 'Core team and advisors',
        vesting: 'Linear over 4 years',
        cliff: '1 year'
    },
    incentives: {
        amount: 300_000_000,      // 30%
        purpose: 'Liquidity mining, market making',
        vesting: 'Linear over 5 years',
        cliff: 'None'
    },
    community: {
        amount: 150_000_000,      // 15%
        purpose: 'Bootcamp, bounties, airdrops',
        vesting: 'Linear over 3 years',
        cliff: 'None'
    },
    publicSale: {
        amount: 50_000_000,       // 5%
        purpose: 'Public token sale',
        vesting: '20% TGE, rest over 6 months',
        cliff: 'None'
    }
};
```

**Vesting Schedule Visualization:**
```
Month   0    6    12   18   24   30   36   42   48
      ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐
Team  │ 0  │ 0  │ 12.5% │ 25% │ 37.5% │ 50% │ 62.5% │ 75% │ 100% │
      └────┴────┴────┴────┴────┴────┴────┴────┴────┘
            Cliff         Linear vesting over 4 years
            
      ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐
Comm  │ 33%│ 33%│ 66%│ 66%│100%│    │    │    │     │
      └────┴────┴────┴────┴────┴────┴────┴────┴────┘
            No cliff, linear over 3 years
```

---

### Revenue Distribution Model

**Fee Revenue Breakdown:**

```typescript
const REVENUE_DISTRIBUTION = {
    stakers: {
        percent: 40,
        description: 'Distributed to DARK token stakers'
    },
    buyback: {
        percent: 30,
        description: 'Buy DARK from market and burn'
    },
    treasury: {
        percent: 20,
        description: 'Protocol treasury for development'
    },
    team: {
        percent: 10,
        description: 'Team compensation and operations'
    }
};

// Example with $1M monthly fees
const monthlyRevenue = 1_000_000;
const distribution = {
    toStakers: 400_000,    // $400k in USDT
    toBuyback: 300_000,    // $300k to buy & burn DARK
    toTreasury: 200_000,   // $200k for development
    toTeam: 100_000        // $100k for team
};
```

---

### Staking Mechanisms

#### Staking Contract

```rust
#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub tier: StakeTier,
    pub locked_until: i64,
    pub rewards_earned: u64,
    pub last_claim: i64,
    pub created_at: i64,
}

pub fn stake_tokens(
    ctx: Context<StakeTokens>,
    amount: u64,
    lock_period: u32
) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;
    
    // Transfer DARK to staking vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.staking_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }
        ),
        amount
    )?;
    
    // Record stake
    stake_account.owner = ctx.accounts.user.key();
    stake_account.amount = amount;
    stake_account.tier = determine_tier(amount, lock_period);
    stake_account.locked_until = clock.unix_timestamp + (lock_period as i64 * 86400);
    stake_account.created_at = clock.unix_timestamp;
    
    Ok(())
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;
    
    // Calculate rewards
    let rewards = calculate_rewards(stake_account)?;
    
    // Transfer USDT rewards
    let seeds = &[
        b"rewards_vault",
        &[ctx.bumps.rewards_vault]
    ];
    
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.rewards_vault.to_account_info(),
                to: ctx.accounts.user_usdt_account.to_account_info(),
                authority: ctx.accounts.rewards_vault.to_account_info(),
            },
            &[&seeds[..]]
        ),
        rewards
    )?;
    
    stake_account.rewards_earned += rewards;
    stake_account.last_claim = clock.unix_timestamp;
    
    Ok(())
}
```

#### Unstaking with Lock Period

```typescript
class UnstakingManager {
    async unstake(userId: string, amount: number): Promise<void> {
        const stake = await this.getStake(userId);
        
        // Check lock period
        if (Date.now() < stake.locked_until) {
            throw new Error(`Tokens locked until ${new Date(stake.locked_until)}`);
        }
        
        // Check unstaking amount
        if (amount > stake.amount) {
            throw new Error('Insufficient staked amount');
        }
        
        // Apply early unstaking penalty if applicable
        const penalty = this.calculatePenalty(stake, amount);
        const netAmount = amount - penalty;
        
        // Execute unstaking
        await this.executeUnstake(userId, netAmount, penalty);
        
        // Update staking record
        stake.amount -= amount;
        await this.updateStake(stake);
    }
    
    private calculatePenalty(stake: Stake, amount: number): number {
        // No penalty if lock period completed
        if (Date.now() >= stake.locked_until) {
            return 0;
        }
        
        // Progressive penalty based on remaining lock time
        const remainingDays = (stake.locked_until - Date.now()) / (24 * 60 * 60 * 1000);
        const penaltyRate = Math.min(0.20, remainingDays / stake.lockPeriod * 0.20);
        
        return amount * penaltyRate; // Max 20% penalty
    }
}
```

---

### Governance (Limited)

**Governance Rights:**

```typescript
interface GovernanceProposal {
    id: string;
    title: string;
    description: string;
    category: 'MARKET_LISTING' | 'FEE_CHANGE' | 'PARAMETER_ADJUSTMENT';
    proposer: string;
    requiredStake: number;      // 100,000 DARK to propose
    votingPeriod: number;       // 7 days
    quorum: number;             // 10% of staked supply
    threshold: number;          // 66% approval
    status: 'PENDING' | 'ACTIVE' | 'PASSED' | 'REJECTED';
}

class GovernanceSystem {
    async createProposal(proposal: GovernanceProposal): Promise<string> {
        // Verify proposer has enough staked
        const proposerStake = await this.getStakedAmount(proposal.proposer);
        
        if (proposerStake < proposal.requiredStake) {
            throw new Error('Insufficient stake to propose');
        }
        
        // Create proposal
        const proposalId = await this.storeProposal(proposal);
        
        // Start voting period
        await this.startVoting(proposalId);
        
        return proposalId;
    }
    
    async vote(proposalId: string, userId: string, support: boolean): Promise<void> {
        const proposal = await this.getProposal(proposalId);
        const userStake = await this.getStakedAmount(userId);
        
        // Voting power = staked amount
        await this.recordVote({
            proposalId,
            userId,
            votingPower: userStake,
            support,
            timestamp: Date.now()
        });
    }
    
    async executeProposal(proposalId: string): Promise<void> {
        const proposal = await this.getProposal(proposalId);
        const results = await this.tallyVotes(proposalId);
        
        // Check quorum
        if (results.totalVotes < results.requiredQuorum) {
            proposal.status = 'REJECTED';
            return;
        }
        
        // Check threshold
        if (results.supportPercent < proposal.threshold) {
            proposal.status = 'REJECTED';
            return;
        }
        
        // Execute proposal
        proposal.status = 'PASSED';
        await this.implementProposal(proposal);
    }
}
```

**Governable Parameters:**
- New market listings (after security review)
- Fee structure adjustments (within bounds)
- Staking tier requirements
- Revenue distribution percentages
- Governance parameters themselves

**Non-Governable (Immutable):**
- Core smart contract logic
- Security parameters
- Token supply
- Multisig requirements

---

### Comparison to Similar Tokens

| Feature | DARK | HYPE | ASTER | RAY | MANTA | JUP | PUMP |
|---------|------|------|-------|-----|-------|-----|------|
| Chain | Solana | Custom L1 | Solana | Solana | ETH L2 | Solana | Solana |
| Fee Discount | ✅ 20% | ✅ | ✅ | ✅ 10% | ✅ | ✅ | ❌ |
| Staking Yield | ✅ 8-25% | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Governance | ✅ Limited | ✅ Full | ✅ Limited | ✅ Full | ✅ Full | ✅ Full | ❌ |
| Buyback/Burn | ✅ 30% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Max Supply | 1B | 1B | 10B | 555M | 1B | 10B | Unlimited |
| Primary Use | Perps DEX | Perps DEX | Perps DEX | AMM DEX | Privacy L2 | Aggregator | Launchpad |

**Unique Differentiators:**
- **DARK**: Dark pool focus, highest leverage (1000x), ephemeral wallets
- **HYPE**: Custom L1, zero gas fees, highest TVL
- **ASTER**: Cross-chain bridges, institutional focus
- **RAY**: Oldest Solana DEX, deepest liquidity
- **MANTA**: Zero-knowledge privacy, modular L2
- **JUP**: Largest aggregator, best prices
- **PUMP**: Memecoin launchpad, viral growth

---

### Token Launch Plan

**Phase 1: TGE (Token Generation Event)**
- Initial DEX offering (IDO) on Jupiter/Raydium
- 5% of supply (50M DARK)
- Price discovery through bonding curve
- Initial liquidity: $500K
- Launch partners: Jupiter, Raydium, Phantom

**Phase 2: Liquidity Bootstrapping (Month 1-3)**
- High APY liquidity mining (100%+ APY)
- Trading competitions
- Referral bonuses
- Early adopter airdrops

**Phase 3: Utility Activation (Month 3-6)**
- Staking program launch
- Fee discounts go live
- First revenue distribution
- First buyback and burn

**Phase 4: Governance (Month 6-12)**
- Governance proposals enabled
- Community voting begins
- DAO treasury formed
- Long-term roadmap

---


