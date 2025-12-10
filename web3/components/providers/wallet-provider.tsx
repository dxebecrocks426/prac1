"use client";

import { useMemo, ReactNode, useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { LocalnetWalletAdapter } from "@/lib/utils/localnet-wallet-adapter";
import { AutoConnectLocalnet } from "./auto-connect-localnet";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({
  children,
}: WalletContextProviderProps) {
  // Get network from localStorage or default to devnet
  const [network, setNetwork] = useState<WalletAdapterNetwork>(
    WalletAdapterNetwork.Devnet
  );

  useEffect(() => {
    // Load saved network preference (only on client)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("solana-network");
      if (saved === "devnet") {
        setNetwork(WalletAdapterNetwork.Devnet);
      } else if (saved === "testnet") {
        setNetwork(WalletAdapterNetwork.Testnet);
      } else if (saved === "mainnet") {
        setNetwork(WalletAdapterNetwork.Mainnet);
      }
    }
  }, []);

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    // Check localStorage for RPC override (for localnet switching)
    if (typeof window !== "undefined") {
      const savedRpc = localStorage.getItem("solana-rpc-endpoint");
      if (savedRpc) {
        return savedRpc;
      }
    }
    // For local development, use localhost from env
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  // Check if we're on localnet
  const isLocalnet =
    endpoint.includes("localhost") || endpoint.includes("127.0.0.1");

  const wallets = useMemo(() => {
    const standardWallets = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
    ];

    // Add localnet wallet adapter if on localnet
    // Put it first so it's selected by default
    // It will handle redirecting to onboarding if no wallet exists
    if (isLocalnet) {
      try {
        return [new LocalnetWalletAdapter(), ...standardWallets];
      } catch (error) {
        console.error("Failed to create LocalnetWalletAdapter:", error);
        return standardWallets;
      }
    }

    return standardWallets;
  }, [isLocalnet]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <AutoConnectLocalnet />
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
