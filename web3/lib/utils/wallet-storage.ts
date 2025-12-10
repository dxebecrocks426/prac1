import { Keypair } from "@solana/web3.js";

const LOCALNET_WALLET_KEY = "localnet-wallet-keypair";

/**
 * Save keypair to localStorage
 */
export function saveLocalnetWallet(keypair: Keypair): void {
  if (typeof window === "undefined") {
    throw new Error("localStorage is only available in browser");
  }

  // Convert keypair to base64
  const secretKey = keypair.secretKey;
  const base64 = Buffer.from(secretKey).toString("base64");

  localStorage.setItem(LOCALNET_WALLET_KEY, base64);
}

/**
 * Load keypair from localStorage
 */
export function loadLocalnetWallet(): Keypair | null {
  if (typeof window === "undefined") {
    return null;
  }

  const base64 = localStorage.getItem(LOCALNET_WALLET_KEY);
  if (!base64) {
    return null;
  }

  try {
    const secretKey = Buffer.from(base64, "base64");
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Failed to load localnet wallet:", error);
    return null;
  }
}

/**
 * Remove localnet wallet from localStorage
 */
export function removeLocalnetWallet(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(LOCALNET_WALLET_KEY);
}

/**
 * Check if localnet wallet exists
 */
export function hasLocalnetWallet(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(LOCALNET_WALLET_KEY) !== null;
}


