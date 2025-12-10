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
import { positionManagementClient } from "@/lib/api/position-management-api";
import { useStepCTA } from "./step-cta-context";

export function StartPositionManagementStep() {
  const { completeStep } = useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // Check if position management is already running
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const pmStatus = await positionManagementClient.getStatus();
      setIsRunning(pmStatus.running);
      setStatus(pmStatus.running ? "running" : "stopped");
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
        message: "Starting position management service...",
        status: "pending",
      });

      // Start the position management process
      const startResult = await positionManagementClient.start();
      
      if (!startResult.success) {
        throw new Error(startResult.message || "Failed to start position management");
      }

      // Wait a moment for the service to fully start (give more time for rebuild)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if service is healthy
      let isHealthy = false;
      let lastError: Error | null = null;
      for (let i = 0; i < 20; i++) { // Increased retries to 20 (10 seconds total)
        try {
          isHealthy = await positionManagementClient.healthCheck();
          if (isHealthy) {
            break;
          }
        } catch (error) {
          // Service might still be starting, that's okay
          lastError = error instanceof Error ? error : new Error(String(error));
          console.debug(`Health check attempt ${i + 1}/20 failed:`, error);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!isHealthy) {
        const errorMsg = lastError ? `: ${lastError.message}` : "";
        useDevConsoleStore.getState().addEvent({
          type: "warning",
          message: `Position management started but health check failed${errorMsg}. Service may still be starting or CORS may need configuration.`,
          status: "pending",
        });
        throw new Error(`Position management health check failed${errorMsg}. Please check if the service is running on port 8081.`);
      }

      setIsRunning(true);
      setStatus("running");

      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Position management started successfully",
        status: "success",
        details: {
          port: 8081,
          healthy: isHealthy,
        },
      });

      // Complete step only after successful health check
      completeStep("start-position-management");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to start position management: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsStarting(false);
    }
  }, [completeStep]);

  const handleStop = useCallback(async () => {
    try {
      await positionManagementClient.stop();
      setIsRunning(false);
      setStatus("stopped");
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Position management stopped",
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
          Step 6: Start Position Management
        </CardTitle>
        <CardDescription>
          Start the position management service to track and manage trading positions
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
            <li>Manages user trading positions and tracks PnL</li>
            <li>Calculates margin ratios and liquidation prices</li>
            <li>Monitors positions in real-time</li>
            <li>Integrates with settlement relayer for position updates</li>
            <li>Provides position data via REST API</li>
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

