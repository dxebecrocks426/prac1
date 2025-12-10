"use client";

import { useState, useEffect, useCallback } from "react";
import { Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { saveLocalnetWallet } from "@/lib/utils/wallet-storage";
import { CheckCircle2, Copy, Wallet } from "lucide-react";
import { useStepCTA } from "./step-cta-context";

export function CreateWalletStep() {
  const { setWalletAddress, completeStep, walletAddress } =
    useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isCreating, setIsCreating] = useState(false);
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);

  const handleCreateWallet = useCallback(async () => {
    setIsCreating(true);
    try {
      // Generate new keypair
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();

      // Save to localStorage
      saveLocalnetWallet(keypair);

      // Update store
      setWalletAddress(address);
      setCreatedAddress(address);

      // Complete step
      completeStep("create-wallet");
    } catch (error) {
      console.error("Failed to create wallet:", error);
      alert("Failed to create wallet. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [setWalletAddress, completeStep]);

  useEffect(() => {
    // If wallet already exists, use it
    if (walletAddress) {
      setCreatedAddress(walletAddress);
    }
  }, [walletAddress]);

  // Register CTA button
  useEffect(() => {
    if (createdAddress) {
      setCTAConfig(null);
      return;
    }
    
    setCTAConfig({
      label: isCreating ? "Creating Wallet..." : "Create Wallet",
      onClick: handleCreateWallet,
      disabled: isCreating,
      loading: isCreating,
    });

    return () => setCTAConfig(null);
  }, [createdAddress, isCreating, handleCreateWallet, setCTAConfig]);

  const handleCopyAddress = () => {
    if (createdAddress) {
      navigator.clipboard.writeText(createdAddress);
      alert("Address copied to clipboard!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Step 2: Create Wallet
        </CardTitle>
        <CardDescription>
          Generate a new Solana wallet for localnet testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdAddress ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Wallet created successfully!</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Wallet Address:</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                  {createdAddress}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyAddress}
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your wallet keypair has been saved locally. You can now proceed to
              the next step.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to generate a new Solana wallet. The
              keypair will be stored securely in your browser's localStorage.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

