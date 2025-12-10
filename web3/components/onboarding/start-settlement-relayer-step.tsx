"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import {
  CheckCircle2,
  Play,
  Square,
  AlertCircle,
  Server,
} from "lucide-react";
import { settlementRelayerClient } from "@/lib/api/settlement-relayer-api";
import { useStepCTA } from "./step-cta-context";

export function StartSettlementRelayerStep() {
  const { completeStep } = useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // Check if relayer is already running
  useEffect(() => {
    checkRelayerStatus();
    const interval = setInterval(checkRelayerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkRelayerStatus = async () => {
    try {
      const relayerStatus = await settlementRelayerClient.getRelayerStatus();
      setIsRunning(relayerStatus.running);
      setStatus(relayerStatus.running ? "running" : "stopped");
    } catch (error) {
      setIsRunning(false);
      setStatus("stopped");
    }
  };

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Starting settlement relayer service...",
        status: "pending",
      });

      // Start the relayer process
      const startResult = await settlementRelayerClient.startRelayer();
      
      if (!startResult.success) {
        throw new Error(startResult.message || "Failed to start settlement relayer");
      }

      // Wait a moment for the relayer to fully start
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if relayer is healthy
      let isHealthy = false;
      for (let i = 0; i < 10; i++) {
        try {
          isHealthy = await settlementRelayerClient.healthCheck();
          if (isHealthy) {
            break;
          }
        } catch (error) {
          // Relayer might still be starting, that's okay
          console.debug("Health check failed, but relayer was started:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!isHealthy) {
        useDevConsoleStore.getState().addEvent({
          type: "warning",
          message: "Settlement relayer started but health check failed",
          status: "pending",
        });
      }

      setIsRunning(true);
      setStatus("running");

      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Settlement relayer started successfully",
        status: "success",
        details: {
          port: 8080,
          healthy: isHealthy,
        },
      });

      // Complete step
      completeStep("start-settlement-relayer");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to start settlement relayer: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsStarting(false);
    }
  }, [completeStep]);

  const handleStop = useCallback(async () => {
    try {
      await settlementRelayerClient.stopRelayer();
      setIsRunning(false);
      setStatus("stopped");
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Settlement relayer stopped",
        status: "success",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
    }
  }, []);

  // Register CTA button
  useEffect(() => {
    if (isRunning) {
      setCTAConfig({
        label: "Stop Relayer",
        onClick: handleStop,
        variant: "outline",
      });
      return;
    }
    
    setCTAConfig({
      label: isStarting ? "Starting..." : "Start Relayer",
      onClick: handleStart,
      disabled: isStarting,
      loading: isStarting,
    });

    return () => setCTAConfig(null);
  }, [isRunning, isStarting, handleStart, handleStop, setCTAConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Step 6: Start Settlement Relayer
        </CardTitle>
        <CardDescription>
          Start the settlement relayer service to process and batch trades for on-chain settlement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Relayer Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Relayer Status</h4>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600">Running</span>
                <span className="text-xs text-muted-foreground">(Port 8080)</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-sm text-muted-foreground">Stopped</span>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">What does this do?</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Receives matched trades from the mock matching engine</li>
            <li>Batches trades into 1-second windows</li>
            <li>Calculates net positions per user and symbol</li>
            <li>Settles batches on-chain via Solana transactions</li>
            <li>Updates position accounts using CPI calls</li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


