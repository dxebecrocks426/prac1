"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { hasLocalnetWallet } from "@/lib/utils/wallet-storage";

/**
 * Component that auto-connects to LocalnetWalletAdapter if:
 * 1. We're on localnet
 * 2. A localnet wallet exists
 * 3. The wallet is not already connected
 */
export function AutoConnectLocalnet() {
  const { wallet, connect, connected, wallets, select } = useWallet();
  const { connection } = useConnection();
  const hasAttemptedConnect = useRef(false);

  useEffect(() => {
    // Check if we're on localnet
    const isLocalnet =
      connection.rpcEndpoint.includes("localhost") ||
      connection.rpcEndpoint.includes("127.0.0.1");

    // Only auto-connect if:
    // - We're on localnet
    // - A localnet wallet exists
    // - Wallet is not already connected
    // - We haven't already attempted to connect
    if (
      isLocalnet &&
      hasLocalnetWallet() &&
      !connected &&
      !hasAttemptedConnect.current
    ) {
      // Find LocalnetWalletAdapter in the wallets array
      const localnetAdapter = wallets.find(
        (w) => w.adapter.name === "Localnet Wallet"
      );

      if (localnetAdapter) {
        // If wallet is already selected, connect immediately
        if (wallet?.adapter.name === localnetAdapter.adapter.name) {
          hasAttemptedConnect.current = true;
          connect().catch((error: unknown) => {
            // Silently fail - user can manually connect if needed
            // Only log if it's not a WalletNotSelectedError (expected during initialization)
            const errorName =
              error && typeof error === "object" && "name" in error
                ? error.name
                : null;
            if (errorName !== "WalletNotSelectedError") {
              console.log("Auto-connect failed:", error);
            }
            hasAttemptedConnect.current = false; // Allow retry
          });
        } else {
          // Wallet not selected, try to select it first
          hasAttemptedConnect.current = true;
          try {
            // Explicitly select the LocalnetWalletAdapter before connecting
            select(localnetAdapter.adapter.name);
            // Wait for selection to propagate, then connect
            setTimeout(() => {
              // Re-check wallet state - it should be updated by now
              // Note: wallet state might not be updated in closure, so we'll attempt connect
              // The error handler will catch WalletNotSelectedError if wallet isn't ready
              connect().catch((error: unknown) => {
                // Silently fail - user can manually connect if needed
                // Only log if it's not a WalletNotSelectedError (expected during initialization)
                const errorName =
                  error && typeof error === "object" && "name" in error
                    ? error.name
                    : null;
                if (errorName !== "WalletNotSelectedError") {
                  console.log("Auto-connect failed:", error);
                }
                hasAttemptedConnect.current = false; // Allow retry
              });
            }, 300); // Increased timeout to allow selection to propagate
          } catch (error: unknown) {
            // Handle selection errors gracefully
            const errorName =
              error && typeof error === "object" && "name" in error
                ? error.name
                : null;
            if (errorName !== "WalletNotSelectedError") {
              console.log("Auto-select failed:", error);
            }
            hasAttemptedConnect.current = false;
          }
        }
      }
    }
  }, [connection.rpcEndpoint, connected, wallet, connect, wallets, select]);

  return null; // This component doesn't render anything
}
