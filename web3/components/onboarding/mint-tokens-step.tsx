"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { loadLocalnetWallet } from "@/lib/utils/wallet-storage";
import {
  createTokenMint,
  getOrCreateATA,
  mintTokens,
  getTokenBalance,
} from "@/lib/solana/localnet-setup";
import { TokenSymbol } from "@/lib/utils/tokens";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";
import { useStepCTA } from "./step-cta-context";
import { formatNumber } from "@/lib/utils/number-format";

const TOKEN_TO_MINT = {
  symbol: "USDT" as TokenSymbol,
  name: "Tether USD",
  amount: 1_000_000_000,
};

export function MintTokensStep() {
  const { connection } = useConnection();
  const { walletAddress, tokenMints, setTokenMint, completeStep } =
    useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinted, setIsMinted] = useState(false);

  const handleMintToken = useCallback(async () => {
    if (!walletAddress) {
      setError("Wallet address not found");
      return;
    }

    setIsMinting(true);
    setError(null);

    try {
      const walletKeypair = loadLocalnetWallet();
      if (!walletKeypair) {
        throw new Error("Wallet keypair not found");
      }

      const walletPubkey = new PublicKey(walletAddress);

      // Check if mint already exists
      let mintAddress: PublicKey;
      if (tokenMints.USDT) {
        mintAddress = new PublicKey(tokenMints.USDT);
      } else {
        // Create new mint
        mintAddress = await createTokenMint(
          connection,
          walletKeypair,
          walletPubkey, // Mint authority is the wallet itself
          6 // 6 decimals
        );
        const mintAddressStr = mintAddress.toBase58();
        setTokenMint("USDT", mintAddressStr);
        // Also save to localStorage location that getUsdtMint() expects
        // Note: saveLocalnetMints is called by setTokenMint in the store, so this is redundant but safe
      }

      // Get or create ATA
      const ata = await getOrCreateATA(
        connection,
        walletKeypair,
        mintAddress,
        walletPubkey
      );

      // Check if tokens already exist
      try {
        const balance = await getTokenBalance(connection, ata);
        if (balance > BigInt(0)) {
          // Tokens already exist, skip minting
          setIsMinted(true);
          completeStep("mint-tokens");
          return;
        }
      } catch {
        // Account doesn't exist, proceed with minting
      }

      // Mint tokens
      await mintTokens(
        connection,
        walletKeypair,
        mintAddress,
        ata,
        walletKeypair, // Mint authority
        TOKEN_TO_MINT.amount,
        6 // 6 decimals
      );

      setIsMinted(true);
      completeStep("mint-tokens");
    } catch (err) {
      console.error("Minting failed:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to mint USDT. Make sure localnet is running.";
      setError(errorMessage);
    } finally {
      setIsMinting(false);
    }
  }, [walletAddress, connection, tokenMints, setTokenMint, completeStep]);

  useEffect(() => {
    // Check if USDT is already minted
    setIsMinted(!!tokenMints.USDT);
  }, [tokenMints]);

  // Register CTA button
  useEffect(() => {
    if (isMinted) {
      setCTAConfig(null);
      return;
    }
    
    setCTAConfig({
      label: isMinting ? "Minting USDT..." : "Mint USDT",
      onClick: handleMintToken,
      disabled: isMinting || !walletAddress,
      loading: isMinting,
    });

    return () => setCTAConfig(null);
  }, [isMinted, isMinting, walletAddress, handleMintToken, setCTAConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Step 4: Mint SPL Tokens
        </CardTitle>
        <CardDescription>
          Create and mint test USDT tokens for trading
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Token to mint:</p>
          <div
            className={`flex items-center justify-between p-3 rounded border ${
              isMinted
                ? "bg-green-950/50 border-green-800/50"
                : isMinting
                ? "bg-blue-950/50 border-blue-800/50"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              {isMinted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : isMinting ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {TOKEN_TO_MINT.symbol}
              </span>
              <span className="text-xs text-muted-foreground">
                ({TOKEN_TO_MINT.name})
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatNumber(TOKEN_TO_MINT.amount)}
            </span>
          </div>
        </div>

        {isMinted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">USDT minted successfully!</span>
            </div>
            {tokenMints.USDT && (
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>USDT Mint Address:</span>
                  <code className="text-xs bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                    {tokenMints.USDT.slice(0, 8)}...
                  </code>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              You can now proceed to the next step.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/20 border border-destructive/50 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This will create a USDT token mint and mint 1,000,000,000 USDT to
              your wallet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
