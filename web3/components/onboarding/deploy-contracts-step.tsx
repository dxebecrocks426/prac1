"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import {
  CONTRACTS,
  deployAllContractsStream,
  DeployProgress,
} from "@/lib/solana/deploy-contract";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import {
  CheckCircle2,
  Loader2,
  Code,
  AlertCircle,
} from "lucide-react";
import { useStepCTA } from "./step-cta-context";

function TerminalLogViewer({
  logs,
  maxLines = 3,
}: {
  logs: Array<{ message: string; type?: "error" | "info" }>;
  maxLines?: number;
}) {
  // Show only the last maxLines logs (rolling window)
  const visibleLogs = logs.slice(-maxLines);

  return (
    <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-1.5 rounded border border-gray-700">
      <div className="space-y-0.5">
        {visibleLogs.length === 0 ? (
          <div className="text-gray-500 italic text-xs">No logs yet...</div>
        ) : (
          visibleLogs.map((log, index) => (
            <div
              key={`${logs.length - visibleLogs.length + index}`}
              className={`text-xs ${log.type === "error" ? "text-red-400" : "text-[#4ec9b0]"}`}
            >
              <span className="text-gray-500 select-none">$ </span>
              <span className="whitespace-pre-wrap break-words">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type ContractStatus =
  | "pending"
  | "building"
  | "deploying"
  | "completed"
  | "failed";

interface ContractDeploymentState {
  status: ContractStatus;
  programId?: string;
  error?: string;
  logs?: string[];
}

export function DeployContractsStep() {
  const { deployedPrograms, setDeployedProgram, completeStep, markCompleted } =
    useOnboardingStore();
  const { setCTAConfig } = useStepCTA();
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentContract, setCurrentContract] = useState<string | null>(null);
  const [deploymentStates, setDeploymentStates] = useState<
    Map<string, ContractDeploymentState>
  >(new Map());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<
    Map<string, Array<{ message: string; type?: "error" | "info" }>>
  >(new Map());

  useEffect(() => {
    // Initialize deployment states
    const initialStates = new Map<string, ContractDeploymentState>();
    CONTRACTS.forEach((contract) => {
      if (deployedPrograms[contract.id as keyof typeof deployedPrograms]) {
        initialStates.set(contract.id, {
          status: "completed",
          programId:
            deployedPrograms[contract.id as keyof typeof deployedPrograms],
        });
      } else {
        initialStates.set(contract.id, {
          status: "pending",
        });
      }
    });
    setDeploymentStates(initialStates);
  }, [deployedPrograms]);

  const handleDeployAll = useCallback(async () => {
    setIsDeploying(true);
    setError(null);
    setProgress(0);
    setCurrentContract(null);

    useDevConsoleStore.getState().addEvent({
      type: "deploy",
      message: `Starting deployment of ${CONTRACTS.length} contracts`,
      status: "pending",
    });

    const states = new Map<string, ContractDeploymentState>();
    CONTRACTS.forEach((contract) => {
      states.set(contract.id, {
        status: "pending",
      });
    });
    setDeploymentStates(states);

    // Initialize logs for all contracts
    const initialLogs = new Map<
      string,
      Array<{ message: string; type?: "error" | "info" }>
    >();
    CONTRACTS.forEach((contract) => {
      initialLogs.set(contract.id, []);
    });
    setLogs(initialLogs);

    try {
      const results = await deployAllContractsStream(
        (progressUpdate: DeployProgress) => {
          setCurrentContract(progressUpdate.contractId);

          // Update state for this contract
          setDeploymentStates((prev) => {
            const next = new Map(prev);
            next.set(progressUpdate.contractId, {
              status: progressUpdate.status,
              programId: progressUpdate.programId,
              error: progressUpdate.error,
              logs: progressUpdate.logs,
            });

            // Update progress
            const completedCount = Array.from(next.values()).filter(
              (s) => s.status === "completed"
            ).length;
            setProgress((completedCount / CONTRACTS.length) * 100);

            return next;
          });

          // Save program ID if deployment succeeded
          if (
            progressUpdate.status === "completed" &&
            progressUpdate.programId
          ) {
            setDeployedProgram(
              progressUpdate.contractId as keyof DeployedPrograms,
              progressUpdate.programId
            );

            useDevConsoleStore.getState().addEvent({
              type: "deploy",
              message: `Successfully deployed ${progressUpdate.contractId}`,
              status: "success",
              details: {
                programId: progressUpdate.programId,
              },
            });
          } else if (progressUpdate.status === "failed") {
            useDevConsoleStore.getState().addEvent({
              type: "error",
              message: `Failed to deploy ${progressUpdate.contractId}`,
              status: "failed",
              details: {
                error: progressUpdate.error || "Unknown error",
              },
            });
          }
        },
        (contractId, logLine, type) => {
          // Add log line to the contract's log array
          setLogs((prev) => {
            const next = new Map(prev);
            const contractLogs = next.get(contractId) || [];
            next.set(contractId, [...contractLogs, { message: logLine, type }]);
            return next;
          });
        }
      );

      // Check if all contracts were attempted (success or failure)
      const allContractsAttempted = CONTRACTS.every((contract) => {
        const result = results.get(contract.id);
        return result !== undefined; // Contract was attempted
      });

      // Count successful deployments from results
      const successCount = Array.from(results.values()).filter(
        (r) => r.success
      ).length;
      setProgress((successCount / CONTRACTS.length) * 100);

      // Complete step if all contracts were attempted
      // This allows progression to next step even if some contracts failed (as per requirements)
      if (allContractsAttempted) {
        useDevConsoleStore.getState().addEvent({
          type: "deploy",
          message: `Deployment completed: ${successCount}/${CONTRACTS.length} contracts deployed successfully`,
          status: successCount === CONTRACTS.length ? "success" : "failed",
        });
        completeStep("deploy-contracts");
        // Note: Don't mark onboarding complete here - let user complete mock engine step first
      } else if (successCount > 0) {
        // Fallback: if some contracts succeeded but not all were attempted
        useDevConsoleStore.getState().addEvent({
          type: "deploy",
          message: `Partial deployment: ${successCount}/${CONTRACTS.length} contracts deployed`,
          status: "success",
        });
        completeStep("deploy-contracts");
      } else {
        useDevConsoleStore.getState().addEvent({
          type: "error",
          message: "Failed to deploy all contracts",
          status: "failed",
        });
        setError(
          "Failed to deploy all contracts. Please check the logs and try again."
        );
      }
    } catch (error: unknown) {
      console.error("Deployment failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Deployment failed: ${errorMessage}`,
        status: "failed",
      });
      setError(
        errorMessage ||
          "Failed to deploy contracts. Make sure localnet is running and Anchor CLI is installed."
      );
    } finally {
      setIsDeploying(false);
      setCurrentContract(null);
    }
  }, [setDeployedProgram, completeStep]);

  const allContractsDeployed = Array.from(deploymentStates.values()).every(
    (state) => state.status === "completed"
  );

  // Register CTA button
  useEffect(() => {
    if (allContractsDeployed) {
      setCTAConfig(null);
      return;
    }
    
    setCTAConfig({
      label: isDeploying ? "Deploying Contracts..." : "Deploy All Contracts",
      onClick: handleDeployAll,
      disabled: isDeploying,
      loading: isDeploying,
    });

    return () => setCTAConfig(null);
  }, [allContractsDeployed, isDeploying, handleDeployAll, setCTAConfig]);

  const getStatusIcon = (status: ContractStatus, contractId: string) => {
    const isCurrent = currentContract === contractId;

    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500/30" />;
      case "building":
      case "deploying":
        return <Loader2 className="h-4 w-4 text-gray-500/30 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500/30" />;
      default:
        return isCurrent ? (
          <Loader2 className="h-4 w-4 text-gray-500/30 animate-spin" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
        );
    }
  };

  const completedCount = Array.from(deploymentStates.values()).filter(
    (s) => s.status === "completed"
  ).length;
  const failedCount = Array.from(deploymentStates.values()).filter(
    (s) => s.status === "failed"
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Status Bar - Sticky */}
      {(isDeploying || completedCount > 0 || failedCount > 0) && (
        <Card className="sticky top-0 z-20 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {currentContract
                              ? `Deploying ${
                                  CONTRACTS.find((c) => c.id === currentContract)?.name
                                }...`
                              : "Preparing deployment..."}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {completedCount}/{CONTRACTS.length} completed
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : allContractsDeployed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        All contracts deployed successfully
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      <span className="text-sm text-muted-foreground">
                        Ready to deploy {CONTRACTS.length} contracts
                      </span>
                    </>
                  )}
                </div>
              </div>
              {isDeploying && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {CONTRACTS.map((contract) => {
                    const state = deploymentStates.get(contract.id);
                    if (!state || state.status === "pending") return null;
                    return (
                      <div
                        key={contract.id}
                        className={`h-2 w-2 rounded-full ${
                          state.status === "completed"
                            ? "bg-green-500"
                            : state.status === "failed"
                            ? "bg-red-500"
                            : "bg-gray-500"
                        }`}
                        title={contract.name}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Step 5: Deploy Smart Contracts
          </CardTitle>
          <CardDescription>
            Deploy all Anchor programs to your localnet for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-2">
            {CONTRACTS.map((contract) => {
              const state = deploymentStates.get(contract.id) || {
                status: "pending" as ContractStatus,
              };
              const isCurrent = currentContract === contract.id;
              const contractLogs = logs.get(contract.id) || [];

              return (
                <div key={contract.id} className="space-y-1.5">
                  <div
                    className={`flex items-center justify-between p-2.5 rounded border ${
                      state.status === "completed"
                        ? "bg-green-950/50 border-green-800/50"
                        : state.status === "failed"
                        ? "bg-red-950/50 border-red-800/50"
                        : isCurrent
                        ? "bg-gray-950/50 border-gray-800/50"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {getStatusIcon(state.status, contract.id)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {contract.name}
                          </span>
                          {state.status === "completed" && state.programId && (
                            <code className="text-xs bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded border border-border flex-shrink-0">
                              {state.programId.slice(0, 8)}...
                            </code>
                          )}
                        </div>
                        {state.error && (
                          <p className="text-xs text-red-400 mt-0.5 truncate">
                            {state.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Always show logs (last 3 lines for compactness) */}
                  {contractLogs.length > 0 && (
                    <TerminalLogViewer logs={contractLogs} maxLines={3} />
                  )}
                </div>
              );
            })}
          </div>

          {allContractsDeployed && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  All contracts deployed successfully!
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                You can now proceed to the next step.
              </p>
            </div>
          )}

          {error && !allContractsDeployed && (
            <div className="pt-2 border-t">
              <div className="bg-destructive/20 border border-destructive/50 text-destructive text-sm p-2.5 rounded">
                <p className="font-medium mb-1.5">{error}</p>
                <p className="text-xs text-destructive/80">
                  Make sure: Solana validator is running • Anchor CLI is installed • You have sufficient SOL
                </p>
              </div>
            </div>
          )}

          {!isDeploying && !allContractsDeployed && !error && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                This will build and deploy all {CONTRACTS.length} Anchor programs sequentially to your localnet.
                This may take a few minutes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
