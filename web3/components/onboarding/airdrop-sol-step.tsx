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
import { airdropSol } from "@/lib/solana/localnet-setup";
import { Coins, CheckCircle2 } from "lucide-react";
import { useStepCTA } from "./step-cta-context";
import { formatBalance } from "@/lib/utils/number-format";

export function AirdropSolStep() {
  const { connection } = useConnection();
  const { walletAddress, setSolBalance, completeStep, solBalance } =
    useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [airdropAmount] = useState(10); // 10 SOL
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const checkBalance = async () => {
    if (!walletAddress) return;

    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(pubkey);
      const solBalanceValue = balance / 1_000_000_000;
      setSolBalance(solBalanceValue);
    } catch (error) {
      console.error("Failed to check balance:", error);
    }
  };

  const handleAirdrop = useCallback(async () => {
    if (!walletAddress) {
      setError("Wallet address not found");
      return;
    }

    setIsAirdropping(true);
    setError(null);

    try {
      const pubkey = new PublicKey(walletAddress);
      const sig = await airdropSol(connection, pubkey, airdropAmount);

      setSignature(sig);
      await checkBalance();
      completeStep("airdrop-sol");
    } catch (error: any) {
      console.error("Airdrop failed:", error);
      setError(
        error.message || "Failed to airdrop SOL. Make sure localnet is running."
      );
    } finally {
      setIsAirdropping(false);
    }
  }, [walletAddress, airdropAmount, connection, completeStep, setSolBalance, checkBalance]);

  const hasEnoughSol = solBalance !== null && solBalance >= 2;

  useEffect(() => {
    // Check balance if wallet exists
    if (walletAddress) {
      checkBalance();
    }
  }, [walletAddress, connection, checkBalance]);

  // Register CTA button
  useEffect(() => {
    if (hasEnoughSol) {
      setCTAConfig(null);
      return;
    }
    
    setCTAConfig({
      label: isAirdropping ? "Requesting Airdrop..." : `Request ${airdropAmount} SOL`,
      onClick: handleAirdrop,
      disabled: isAirdropping || !walletAddress,
      loading: isAirdropping,
    });

    return () => setCTAConfig(null);
  }, [hasEnoughSol, isAirdropping, walletAddress, airdropAmount, handleAirdrop, setCTAConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Step 3: Airdrop SOL
        </CardTitle>
        <CardDescription>
          Request SOL tokens for transaction fees on localnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {walletAddress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wallet Address:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </code>
            </div>
            {solBalance !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-medium">{formatBalance(solBalance, 4)} SOL</span>
              </div>
            )}
          </div>
        )}

        {hasEnoughSol ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                You have enough SOL ({formatBalance(solBalance, 4)} SOL)
              </span>
            </div>
            {signature && (
              <div className="text-xs text-muted-foreground">
                Transaction: {signature.slice(0, 16)}...
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              You can proceed to the next step to mint tokens.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Request {airdropAmount} SOL to your wallet. This will be used for
              transaction fees.
            </p>
            {signature && (
              <div className="text-xs text-muted-foreground">
                Transaction: {signature.slice(0, 16)}...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

