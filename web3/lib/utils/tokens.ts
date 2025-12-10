import { PublicKey } from "@solana/web3.js";

export type TokenSymbol = "USDT" | "BTC" | "ETH" | "XRP" | "ADA";

// Token mint addresses for different networks
const TOKEN_MINTS: Record<TokenSymbol, Record<string, string>> = {
  USDT: {
    devnet: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", // USDC on devnet (using as placeholder)
    testnet: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", // Placeholder
    mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT on mainnet
    localnet: "", // Will be stored in localStorage
  },
  BTC: {
    devnet: "",
    testnet: "",
    mainnet: "",
    localnet: "",
  },
  ETH: {
    devnet: "",
    testnet: "",
    mainnet: "",
    localnet: "",
  },
  XRP: {
    devnet: "",
    testnet: "",
    mainnet: "",
    localnet: "",
  },
  ADA: {
    devnet: "",
    testnet: "",
    mainnet: "",
    localnet: "",
  },
};

const LOCALNET_MINTS_KEY = "localnet-token-mints";

/**
 * Get token mint addresses from localStorage for localnet
 */
function getLocalnetMints(): Record<TokenSymbol, string> {
  if (typeof window === "undefined") {
    return {} as Record<TokenSymbol, string>;
  }

  try {
    const stored = localStorage.getItem(LOCALNET_MINTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load localnet mints:", error);
  }

  return {} as Record<TokenSymbol, string>;
}

/**
 * Save token mint addresses to localStorage for localnet
 */
export function saveLocalnetMints(mints: Record<TokenSymbol, string>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LOCALNET_MINTS_KEY, JSON.stringify(mints));
  } catch (error) {
    console.error("Failed to save localnet mints:", error);
  }
}

/**
 * Get token mint address from onboarding store (client-side only)
 */
function getOnboardingTokenMint(symbol: TokenSymbol): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const stored = localStorage.getItem("localnet-onboarding-storage");
    if (stored) {
      const data = JSON.parse(stored);
      return data?.state?.tokenMints?.[symbol];
    }
  } catch (error) {
    // Ignore errors
  }
  return undefined;
}

/**
 * Get token mint address based on network and symbol
 */
export function getTokenMint(symbol: TokenSymbol, endpoint: string): PublicKey {
  // Check if localnet and try to get from localStorage
  if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
    const localnetMints = getLocalnetMints();
    let mintAddress = localnetMints[symbol];

    // Fallback: check onboarding store if not found in localnetMints
    if (!mintAddress) {
      mintAddress = getOnboardingTokenMint(symbol);
      // If found in onboarding store, sync it to localnetMints for future use
      if (mintAddress) {
        saveLocalnetMints({ ...localnetMints, [symbol]: mintAddress });
      }
    }

    if (mintAddress) {
      return new PublicKey(mintAddress);
    }
    // Fallback to default (empty string will throw error)
    if (TOKEN_MINTS[symbol].localnet) {
      return new PublicKey(TOKEN_MINTS[symbol].localnet);
    }
    throw new Error(
      `Token mint for ${symbol} not found on localnet. Please complete onboarding.`
    );
  } else if (endpoint.includes("devnet")) {
    const mint = TOKEN_MINTS[symbol].devnet;
    if (!mint) {
      throw new Error(`Token mint for ${symbol} not configured for devnet`);
    }
    return new PublicKey(mint);
  } else if (endpoint.includes("testnet")) {
    const mint = TOKEN_MINTS[symbol].testnet;
    if (!mint) {
      throw new Error(`Token mint for ${symbol} not configured for testnet`);
    }
    return new PublicKey(mint);
  } else {
    const mint = TOKEN_MINTS[symbol].mainnet;
    if (!mint) {
      throw new Error(`Token mint for ${symbol} not configured for mainnet`);
    }
    return new PublicKey(mint);
  }
}

/**
 * Get USDT mint address based on network (backward compatibility)
 */
export function getUsdtMint(endpoint: string): PublicKey {
  return getTokenMint("USDT", endpoint);
}

/**
 * Get all available token symbols
 */
export function getAvailableTokens(): TokenSymbol[] {
  return ["USDT", "BTC", "ETH", "XRP", "ADA"];
}
