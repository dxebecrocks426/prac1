"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useOnboardingStore,
  DeployedPrograms,
} from "@/lib/store/use-onboarding-store";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import {
  CheckCircle2,
  Play,
  Square,
  AlertCircle,
  Code,
} from "lucide-react";
import { mockEngineClient } from "@/lib/api/mock-engine-api";
import { settlementRelayerClient } from "@/lib/api/settlement-relayer-api";
import { useStepCTA } from "./step-cta-context";

export function StartMockEngineStep() {
  const { completeStep, deployedPrograms, markCompleted } = useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // Check if engine is already running
  useEffect(() => {
    checkEngineStatus();
    const interval = setInterval(checkEngineStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkEngineStatus = async () => {
    try {
      const engineStatus = await mockEngineClient.getEngineStatus();
      setIsRunning(engineStatus.settlementRelayer === "connected");
      setStatus(engineStatus.status);
    } catch (error) {
      setIsRunning(false);
      setStatus("stopped");
    }
  };

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    // Verify required contracts are deployed
    const requiredContracts: (keyof DeployedPrograms)[] = [
      "position-mgmt",
    ];
    const missingContracts = requiredContracts.filter(
      (contract) => !deployedPrograms[contract]
    );

    if (missingContracts.length > 0) {
      const errorMsg = `Required contracts not deployed: ${missingContracts.join(", ")}`;
      setError(errorMsg);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: errorMsg,
        status: "failed",
      });
      setIsStarting(false);
      return;
    }

    // Check if settlement relayer is running
    try {
      const relayerStatus = await settlementRelayerClient.getRelayerStatus();
      if (!relayerStatus.running) {
        const errorMsg = "Settlement relayer is not running. Please start it first.";
        setError(errorMsg);
        useDevConsoleStore.getState().addEvent({
          type: "error",
          message: errorMsg,
          status: "failed",
        });
        setIsStarting(false);
        return;
      }
    } catch (error) {
      const errorMsg = "Failed to check settlement relayer status. Please ensure it is running.";
      setError(errorMsg);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: errorMsg,
        status: "failed",
      });
      setIsStarting(false);
      return;
    }

    try {
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Starting mock matching engine...",
        status: "pending",
      });

      // Start the engine process
      const startResult = await mockEngineClient.startMockEngine();
      
      if (!startResult.success) {
        throw new Error(startResult.message || "Failed to start mock engine");
      }

      // Wait a moment for the engine to fully start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if settlement relayer is available
      let engineStatus;
      try {
        engineStatus = await mockEngineClient.getEngineStatus();
        if (engineStatus.settlementRelayer !== "connected") {
          useDevConsoleStore.getState().addEvent({
            type: "warning",
            message: "Mock engine started but settlement relayer connection status is unknown",
            status: "pending",
          });
        }
      } catch (error) {
        // Engine might still be starting, that's okay
        console.debug("Engine status check failed, but engine was started:", error);
      }

      setIsRunning(true);
      setStatus("running");

      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Mock matching engine started successfully",
        status: "success",
        details: {
          settlementRelayer: engineStatus.settlementRelayer,
        },
      });

      // Complete step and mark onboarding as complete (this is the final step)
      completeStep("start-mock-engine");
      // Mark onboarding complete to trigger redirect to trade page
      markCompleted();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to start mock engine: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsStarting(false);
    }
  }, [deployedPrograms, completeStep, markCompleted]);

  const handleStop = useCallback(async () => {
    try {
      await mockEngineClient.stopMockEngine();
      setIsRunning(false);
      setStatus("stopped");
      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: "Mock matching engine stopped",
        status: "success",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
    }
  }, []);

  const requiredContracts: (keyof DeployedPrograms)[] = ["position-mgmt"];
  const allContractsDeployed = requiredContracts.every(
    (contract) => deployedPrograms[contract]
  );

  // Register CTA button
  useEffect(() => {
    if (isRunning) {
      setCTAConfig({
        label: "Stop Engine",
        onClick: handleStop,
        variant: "outline",
      });
      return;
    }
    
    setCTAConfig({
      label: isStarting ? "Starting..." : "Start Engine",
      onClick: handleStart,
      disabled: isStarting || !allContractsDeployed,
      loading: isStarting,
    });

    return () => setCTAConfig(null);
  }, [isRunning, isStarting, allContractsDeployed, handleStart, handleStop, setCTAConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Step 7: Start Mock Matching Engine
        </CardTitle>
        <CardDescription>
          Start the mock matching engine to enable order matching and settlement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deployment Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Required Contracts</h4>
          <div className="space-y-1">
            {requiredContracts.map((contract) => {
              const isDeployed = !!deployedPrograms[contract];
              return (
                <div
                  key={contract}
                  className="flex items-center gap-2 text-sm"
                >
                  {isDeployed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className={isDeployed ? "text-muted-foreground" : ""}>
                    {contract}
                  </span>
                  {isDeployed && (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {deployedPrograms[contract]?.slice(0, 8)}...
                    </code>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Engine Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Engine Status</h4>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600">Running</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-sm text-muted-foreground">Stopped</span>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!allContractsDeployed && (
          <p className="text-xs text-muted-foreground">
            Please deploy all required contracts before starting the engine.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

