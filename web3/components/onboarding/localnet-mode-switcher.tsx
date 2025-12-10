"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { hasLocalnetWallet } from "@/lib/utils/wallet-storage";
import { Server, Wallet } from "lucide-react";

export function LocalnetModeSwitcher() {
  const { disconnect, connected } = useWallet();
  const { isCompleted } = useOnboardingStore();
  const [isLocalnet, setIsLocalnet] = useState(false);
  const [hasLocalWallet, setHasLocalWallet] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check both localStorage RPC override and env variable
      const savedRpc = localStorage.getItem("solana-rpc-endpoint");
      const envRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";
      const endpoint = savedRpc || envRpc;
      const isLocal =
        endpoint.includes("localhost") ||
        endpoint.includes("127.0.0.1") ||
        endpoint.includes("8899");
      setIsLocalnet(isLocal);
      setHasLocalWallet(hasLocalnetWallet());
    }
  }, []);

  const handleSwitchToLocalnet = async () => {
    // Disconnect any connected wallets first
    if (connected) {
      await disconnect();
    }
    // Save localnet RPC endpoint preference
    if (typeof window !== "undefined") {
      localStorage.setItem("solana-rpc-endpoint", "http://localhost:8899");
    }
    // Redirect to onboarding (page will reload and use new RPC)
    window.location.href = "/onboarding/localnet";
  };

  // Don't show if already on localnet
  if (isLocalnet) {
    return null;
  }

  // Show option to switch to localnet mode
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          Localnet Development Mode
        </CardTitle>
        <CardDescription className="text-xs">
          Switch to localnet for testing with your own validator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasLocalWallet && isCompleted ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              You have a localnet wallet set up. Switch to localnet mode to use
              it.
            </p>
            <Button
              onClick={async () => {
                // Disconnect any connected wallets first
                if (connected) {
                  await disconnect();
                }
                // Save localnet RPC endpoint preference
                if (typeof window !== "undefined") {
                  localStorage.setItem(
                    "solana-rpc-endpoint",
                    "http://localhost:8899"
                  );
                }
                // Redirect to onboarding (page will reload and use new RPC)
                window.location.href = "/onboarding/localnet";
              }}
              size="sm"
              variant="outline"
              className="w-full"
            >
              Switch to Localnet
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Set up a localnet wallet and get test tokens for development.
            </p>
            <Button
              onClick={handleSwitchToLocalnet}
              size="sm"
              className="w-full"
            >
              <Wallet className="h-3 w-3 mr-2" />
              Set Up Localnet Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

