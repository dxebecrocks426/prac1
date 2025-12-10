GoDark DEX Plan

Summary:
GoDark is a crypto dark pool decentralized exchange (DEX) that runs on the Solana blockchain. GoDark is designed to reduce market impact of all trade sizes and maintain absolute privacy.

Function:
Blockchain: 
Layer 2 (L1 is Solana)
Single-chain solution
Instruments: 
Symbol format:
Base-Quote-Type (i.e. BTC-USDT-PERP)
Only the following quote asset should be included:
USDT
The following base assets should be included:
Top 50 crypto assets
BTC
ETH
BNB
XRP
SOL
USDC
TRX
DOGE
ADA
HYPE
LINK
ESDe
XLM
BCH
SUI
LEO
AVAX
LTC
HBAR
SHIB
XMR
DAI
TON
MNT
CRO
DOT
ZEC
TAO
UNI
OKB
AAVE
BGB
ENA
WLFI
PEPE
PYUSD
NEAR
ETC
USD1
APT
M
ONDO
POL
ASTER
WLD
KCS
IP
ARB
PI
ICP
FX pairs as base assets, such as:
USD
GBP
EUR
JPY
CHF
AUD
CAD
CNY
HKD
SGD
Order Matching: 
Submitted via UI/API/WS, not onchain
Processed off-chain using GoDark matching engine
Funding Rate Mechanism:
Calculated every 1 second
Paid every 1 hour
Calculated using a VWAP pricing oracle from consolidated price feed
Leverage
Up to 1,000x leverage
Isolated margin only
Liquidation engine to monitor order status (filled, exited, etc.), spot price via price oracle
Settlement: 
All transactions are on a per-trade basis
Settlement relayer batch smart contract
Ephemeral (temporary, unlinked) wallets 
Fees (USDT only) sent to GoDark fee wallet at settlement
Order Types:
Market
Limit
Peg to Mid/Bid/Ask
Time in Force:
Immediate or Cancel
Fill or Kill
Good Till Date
Good Till Cancel
Order Attributes:
All or None
Min Qty
NBBO Protection
Visibility (dark only, no lit)
Create Account Flow:
Add wallet
Create account with email and password
Confirm email, configure optional 2FA
Trade
UI Elements:
Backend:
X
Menu Items:
Trade (main page on app.godark.xyz)
Stats (simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on app.godark.xyz)
Referrals (simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on app.godark.xyz)	
Docs (separate page on app.godark.xyz)
Settings Icon (Icon on right side with simple pop-up at center of screen with blurred trade background, don’t leave the main trade page on app.godark.xyz)
Components:
Trade (main page on app.godark.xyz)
Funding rate stats and countdown at header
Order form
Chart with symbol selector showing Hyperliquid prices and orderbook
Trade Table Columns:
Working Orders
Algorithm ID
Date
Time
Type (algo type)
Symbol
Side
Avg Fill Price
Avg Order Price
Fill Quantity
Order Quantity
Fill Value
Order Value
Fill Progress
Status
Actions
Order History
Algorithm ID
Date
Time
Type (algo type)
Symbol
Side
Avg Fill Price
Avg Order Price
Fill Quantity
Order Quantity
Fill Value
Order Value
Fill Progress
Status
Actions

Open Positions
Symbol (should be like pic, if long green, if short red and have leverage refer to hyperliquid)
Size (should be colour of direction)
Position Value (USDT)
Margin (In dollars and brackets at end saying cross/isolated)
Realized PNL
Nurealized PNL
Entry Price
Mark Price
Funding


Stats (on stats.godark.xyz)
Three different sections (all metrics published at midnight UTC from two days before, so if it’s Saturday midnight UTC, we would display all of Thursday’s data):
Execution Quality & Savings (in aggregate)
Cumulative chart of daily values
Numerical value of the most recent day
Metrics to filter in chart:
Slippage and Market Impact Saved (USDT)
MEV Avoided (USDT)
GoDark Market Data (in aggregate)
Cumulative chart of daily values
Numerical value of the most recent day
Metrics to filter in chart:
Matched Volume (USDT)
Liquidity Submitted (USDT)
Buy / Sell Ratio (%)
Avg Time to Fill (Sec)
Avg Trade Size (USDT)
Avg Order Size (USDT)
Matched Trade Count (#)
Order Count (#)
Operational Transparency (in aggregate)
Cumulative chart of daily values
Numerical value of the most recent day
Metrics to filter in chart:
Fees Collected (USDT)
Avg Settlement Finality Time (Sec)
Failed Settlements (#)
System Downtime (Min)
Avg API Response Time (Sec)
Admin (on app.godark.xyz)
Linked Wallet
Linked wallet address with link/unlink option (one wallet only per account)
API Key Management
Display table of current keys, with edit/delete functions
Key Name (editable)
API Key (not editable)
Secret Key (not editable)
Passphrase (not editable)
IP Whitelist (editable)
Option to add additional key
Account Management
Email, password, 2FA authenticator app (optional) settings
Delete account option
Activity
Last login (device and IP)
Docs (on docs.godark.xyz)
Separate docs page
Basic Interface Mode:
Replace candlestick chart with area line chart
Remove last trades feed and orderbook feed
Keep bottom section of working orders, order history, open positions, wallet holdings
Move best bid, bid, and ask on top of the chart  where the funding rates are
Order form options:
Market and limit orders only
Quick leverage selector: 1x, 10x, 100x, 100x
Quantity slider
GTC only
Add TP/SL option
No other order attributes (i.e. remove NBBO, Min Qty, etc.)
Keep account metrics
IP Restrictions:
North America:
US
Canada (Quebec and Ontario only)
Central and South America:
Bolivia
Ecuador
Cuba
Europe:
United Kingdom
France
Belarus
Russia
Ukraine
Crimea, Donetsk, Luhansk
Asia:
China (mainland)
North Korea
Iran
Iraq
Syria
Bangladesh
Myanmar
Nepal
Africa:
Algeria
Morocco
Egypt

Settlements:
	Wallet Connection:
Connect/Create Wallet and Approve
Wallet UI
User connects Phantom/Trust/Solflare or creates wallet and signs one approval giving the GoDark program delegate rights to spend up to X USDT
Vault Creation
Smart Contract
Program deterministically creates a PDA (ephemeral vault) for that user (e.g. seed = [user address, timestamp]). No keys; program-owned.
Deposit/Withdraw
Contract Delegate
Program automatically pulls approved USDT from user wallet into PDA when trading starts.
Trading Cycle
Off-chain Engine
Trades execute off-chain in 1-second windows; engine computes each user’s net ΔUSDT.
Batch Settlement
Contract Program
Every 1 s, contract moves net ΔUSDT between PDAs; updates on-chain ledger / Merkle root.
Vault Cleanup
Contract Program
PDA closed; any unused margin returned to user ATA; rent refunded.
Withdraw/Revoke
Wallet UI
User can withdraw unlocked margin anytime or revoke approval to halt contract access.
	UX Summary:
Connect Wallet
Options to Connect Existing Wallet:
Phantom
Trust
Solflare
Options to Create New Wallet
Sign in with Google/Apple/X/Discord
Insert Email Address
Authorize GoDark
“Authorize X (user input field) USDT for trading”
Withdraw
“Withdraw Unlocked Balance”
One click, no signature required
Revoke
“Revoke Wallet Access”

	Settlement Flow:
	










Token:
Utilities:
Staking Yield (via x% of revenue being allocated to token holders)
Rebate for reduced fees
Airdrops
Burn-and-buyback
Bug bounties
Allocation
Foundation
GoQuant
Team
Incentives
Community
Similar tokens:
HYPE, ASTER, Raydium, Manta, Jupiter, PUMP

Inspiration
Humidifi
Solana AMM, dark pool privacy
Jupiter routes 50% volume through them
Shows Solana’s market is shifting towards dark pools
Manta
ETH L2, focus on privacy
Evolving from Bybit's early backing of Mantle's predecessor (BitDAO)
Utilities: 
Staking, fee payments and rebates, governance (limited), 
Utilities on Bybit: 
Holders get fee discounts, extended loan terms, and use MNT as collateral in lending/staking pools
