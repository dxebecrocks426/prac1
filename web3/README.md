# GoDark DEX - Web3 Interface

This is the Next.js frontend application for the GoDark Decentralized Exchange (DEX).

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Blockchain:** Solana (@solana/web3.js, @coral-xyz/anchor)
- **Wallet Integration:** @solana/wallet-adapter-react

## Getting Started

### Prerequisites

- Bun (v1.0+)
- Solana wallet extension (Phantom, Solflare, or Trust Wallet)

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the root of this directory:

```env
# Solana RPC Endpoint
# For local development: http://localhost:8899
# For devnet: https://api.devnet.solana.com
# For mainnet: https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899
```

## Project Structure

```
web3/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with wallet provider
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── providers/         # React context providers
│   │   └── wallet-provider.tsx
│   ├── wallet/            # Wallet-related components
│   │   └── wallet-button.tsx
│   └── ui/                # shadcn/ui components
├── lib/
│   └── utils.ts           # Utility functions
└── public/                # Static assets
```

## Features

- ✅ Solana wallet connection (Phantom, Solflare, Trust Wallet)
- ✅ Wallet balance display
- ✅ Responsive UI with shadcn/ui components
- ✅ Dark mode support

## Development

### Adding shadcn/ui Components

```bash
bunx shadcn@latest add [component-name]
```

### Connecting to Local Solana Validator

1. Start a local Solana validator:
   ```bash
   solana-test-validator
   ```

2. Set `NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899` in `.env.local`

3. Connect your wallet to the local network in the wallet extension settings

## Next Steps

- [ ] Integrate with GoDark DEX API endpoints
- [ ] Add order placement UI
- [ ] Add position management UI
- [ ] Add market data display
- [ ] Add trading charts
- [ ] Integrate with Solana smart contracts (Anchor programs)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [shadcn/ui](https://ui.shadcn.com/)
