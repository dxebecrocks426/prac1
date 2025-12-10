"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { CheckCircle2, Loader2, Server } from "lucide-react";
import { useStepCTA } from "./step-cta-context";

export function StartValidatorStep() {
  const { connection } = useConnection();
  const { completeStep } = useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"stopped" | "starting" | "running">("stopped");

  const checkValidatorStatus = async () => {
    try {
      const response = await fetch("/api/validator");
      const data = await response.json();

      if (data.running && data.healthCheck) {
        setIsRunning(true);
        setStatus("running");
        setError(null);
        // Auto-complete step when validator is ready
        if (!useOnboardingStore.getState().completedSteps.has("start-validator")) {
          completeStep("start-validator");
        }
      } else if (isStarting) {
        setStatus("starting");
      } else {
        setIsRunning(false);
        setStatus("stopped");
      }
    } catch (err) {
      console.error("Failed to check validator status:", err);
    }
  };

  const handleStartValidator = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setStatus("starting");

    useDevConsoleStore.getState().addEvent({
      type: "info",
      message: "Starting Solana localnet validator",
      status: "pending",
    });

    try {
      const response = await fetch("/api/validator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ forceReset: true }), // Always reset validator for onboarding
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to start validator");
      }

      useDevConsoleStore.getState().addEvent({
        type: "info",
        message: data.healthCheck
          ? "Solana localnet validator started successfully"
          : "Validator process started but health check pending",
        status: data.healthCheck ? "success" : "pending",
        details: {
          pid: data.pid?.toString(),
        },
      });

      // Wait a bit and check status
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await checkValidatorStatus();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("stopped");

      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to start validator: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsStarting(false);
    }
  }, [completeStep]);

  useEffect(() => {
    checkValidatorStatus();
    // Poll status every 2 seconds
    const interval = setInterval(checkValidatorStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Register CTA button
  useEffect(() => {
    if (isRunning) {
      setCTAConfig(null);
      return;
    }
    
    setCTAConfig({
      label: isStarting || status === "starting" ? "Starting Validator..." : "Start Validator",
      onClick: handleStartValidator,
      disabled: isStarting || status === "starting",
      loading: isStarting || status === "starting",
    });

    return () => setCTAConfig(null);
  }, [isRunning, isStarting, status, handleStartValidator, setCTAConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Step 1: Start Localnet Validator
        </CardTitle>
        <CardDescription>
          Start the Solana localnet validator for local development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Validator Status:</span>
            <div className="flex items-center gap-2">
              {status === "running" ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600 font-medium">Running</span>
                </>
              ) : status === "starting" ? (
                <>
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="text-blue-600 font-medium">Starting...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-muted-foreground">Stopped</span>
                </>
              )}
            </div>
          </div>
          {status === "running" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">RPC Endpoint:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                http://localhost:8899
              </code>
            </div>
          )}
        </div>

        {isRunning ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Validator is running and ready!
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The localnet validator is running. You can proceed to the next step
              to create your wallet.
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
              Start the Solana localnet validator. This will run in the background
              and provide a local blockchain for testing.
            </p>
            {error && (
              <p className="text-xs text-muted-foreground">
                Make sure Solana CLI is installed and available in your PATH.
                You can install it from{" "}
                <a
                  href="https://docs.solana.com/cli/install-solana-cli-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Solana documentation
                </a>
                .
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

