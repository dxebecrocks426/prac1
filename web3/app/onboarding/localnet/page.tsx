"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { DevConsole } from "@/components/layout/dev-console";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";

export default function LocalnetOnboardingPage() {
  const { connection } = useConnection();
  const { disconnect, connected } = useWallet();
  const [isLocalnet, setIsLocalnet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { addEvent } = useDevConsoleStore();

  const checkNetwork = useCallback(async () => {
    try {
      const endpoint = connection.rpcEndpoint;
      const isLocal =
        endpoint.includes("localhost") ||
        endpoint.includes("127.0.0.1") ||
        endpoint.includes("8899");

      setIsLocalnet(isLocal);

      // Also check if validator is running
      if (isLocal) {
        try {
          await connection.getVersion();
        } catch (error) {
          // Validator might not be running yet - this is expected during onboarding
          // Silently ignore the error
        }
      }
    } catch (error) {
      console.error("Failed to check network:", error);
    } finally {
      setIsChecking(false);
    }
  }, [connection]);

  const handleReset = async () => {
    // Stop validator if running
    try {
      const response = await fetch("/api/validator", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addEvent({
          type: "info",
          message: "Stopped Solana localnet validator",
          status: "success",
        });
      }
    } catch (error) {
      console.error("Failed to stop validator:", error);
    }

    // Stop mock matching engine if running
    try {
      const response = await fetch("/api/mock-engine", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addEvent({
          type: "info",
          message: "Stopped mock matching engine",
          status: "success",
        });
      }
    } catch (error) {
      // Mock engine might not be running, that's okay
      console.debug("Mock engine not running or failed to stop:", error);
    }

    // Stop settlement relayer if running
    try {
      const response = await fetch("/api/settlement-relayer", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addEvent({
          type: "info",
          message: "Stopped settlement relayer service",
          status: "success",
        });
      }
    } catch (error) {
      // Settlement relayer might not be running, that's okay
      console.debug("Settlement relayer not running or failed to stop:", error);
    }

    // Stop position management if running
    try {
      const response = await fetch("/api/position-management", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addEvent({
          type: "info",
          message: "Stopped position management service",
          status: "success",
        });
      }
    } catch (error) {
      // Position management might not be running, that's okay
      console.debug("Position management not running or failed to stop:", error);
    }

    // Stop liquidation engine if running
    try {
      const response = await fetch("/api/liquidation-engine", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addEvent({
          type: "info",
          message: "Stopped liquidation engine service",
          status: "success",
        });
      }
    } catch (error) {
      // Liquidation engine might not be running, that's okay
      console.debug("Liquidation engine not running or failed to stop:", error);
    }

    // Preserve localnet RPC endpoint preference if set
    const savedRpc = localStorage.getItem("solana-rpc-endpoint");
    const isLocalnetRpc =
      savedRpc &&
      (savedRpc.includes("localhost") || savedRpc.includes("127.0.0.1"));

    // Preserve dev console state
    const devConsoleState = localStorage.getItem("dev-console-storage");

    // Clear localStorage
    localStorage.clear();

    // Restore localnet RPC endpoint if it was set
    if (isLocalnetRpc && savedRpc) {
      localStorage.setItem("solana-rpc-endpoint", savedRpc);
    }

    // Restore dev console state
    if (devConsoleState) {
      localStorage.setItem("dev-console-storage", devConsoleState);
    }

    // Clear sessionStorage
    sessionStorage.clear();
    // Hard reload the page
    window.location.reload();
  };

  useEffect(() => {
    // Disconnect any connected wallets before starting onboarding
    if (connected) {
      disconnect().catch(console.error);
    }
    checkNetwork();
  }, [connected, disconnect, checkNetwork]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Checking network...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLocalnet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Wrong Network
            </CardTitle>
            <CardDescription>
              This onboarding flow is only available on localnet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To use the localnet onboarding:
            </p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>
                Start a local Solana validator:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  solana-test-validator
                </code>
              </li>
              <li>
                Set your RPC URL to{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  http://localhost:8899
                </code>
              </li>
              <li>Refresh this page</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Current RPC: {connection.rpcEndpoint}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">GoDark DEX</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              Localnet Onboarding
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-9 w-9"
              title="Reset cache and reload"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to GoDark DEX
          </h2>
          <p className="text-muted-foreground">
            Setup your localnet and go dark
          </p>
        </div>

        <OnboardingWizard />
      </main>

      <DevConsole />
    </div>
  );
}
