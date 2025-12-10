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
import { liquidationEngineClient } from "@/lib/api/liquidation-engine-api";
import { useStepCTA } from "./step-cta-context";

export function StartLiquidationEngineStep() {
  const { completeStep } = useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // Check if liquidation engine is already running
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const leStatus = await liquidationEngineClient.getStatus();
      setIsRunning(leStatus.running);
      setStatus(leStatus.running ? "running" : "stopped");
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
        message: "Starting liquidation engine service...",
        status: "pending",
      });

      // Start the liquidation engine process
      const startResult = await liquidationEngineClient.start();
      
      if (!startResult.success) {
        throw new Error(startResult.message || "Failed to start liquidation engine");
      }

      // Wait a moment for the service to fully start
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if service is healthy
      let isHealthy = false;
      for (let i = 0; i < 10; i++) {
        try {
          isHealthy = await liquidationEngineClient.healthCheck();
          if (isHealthy) {
            break;
          }
        } catch (error) {
          // Service might still be starting, that's okay
          console.debug("Health check failed, but service was started:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!isHealthy) {
        useDevConsoleStore.getState().addEvent({
          type: "warning",
          message: "Liquidation engine started but health check failed",
          status: "pending",
        });
      }

      setIsRunning(true);
      setStatus("running");

      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Liquidation engine started successfully",
        status: "success",
        details: {
          port: 8081,
          healthy: isHealthy,
        },
      });

      // Complete step
      completeStep("start-liquidation-engine");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to start liquidation engine: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsStarting(false);
    }
  }, [completeStep]);

  const handleStop = useCallback(async () => {
    try {
      await liquidationEngineClient.stop();
      setIsRunning(false);
      setStatus("stopped");
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Liquidation engine stopped",
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
        label: "Stop Service",
        onClick: handleStop,
        variant: "outline",
      });
      return;
    }
    
    setCTAConfig({
      label: isStarting ? "Starting..." : "Start Service",
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
          Step 7: Start Liquidation Engine
        </CardTitle>
        <CardDescription>
          Start the liquidation engine service to monitor and liquidate undercollateralized positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Service Status</h4>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600">Running</span>
                <span className="text-xs text-muted-foreground">(Port 8081)</span>
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
            <li>Monitors all open positions for liquidation risk</li>
            <li>Calculates margin ratios and identifies liquidatable positions</li>
            <li>Executes liquidations when positions become undercollateralized</li>
            <li>Manages insurance fund for bad debt coverage</li>
            <li>Provides liquidation statistics and monitoring</li>
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

