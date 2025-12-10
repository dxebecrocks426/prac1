"use client";

import { useState } from "react";
import { useFlowStore, FlowStep } from "@/lib/store/use-flow-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

const stepLabels: Record<FlowStep, string> = {
  "wallet-connection": "1. Connect Wallet",
  "collateral-vault-setup": "2. Setup Vault",
  "place-trade": "3. Place Trade",
  "settlement-relayer": "4. Settlement",
  "position-management": "5. Position Mgmt",
  "oracle-funding-rate": "6. Oracle & Funding",
};

const stepOrder: FlowStep[] = [
  "wallet-connection",
  "collateral-vault-setup",
  "place-trade",
  "settlement-relayer",
  "position-management",
  "oracle-funding-rate",
];

export function StepIndicator() {
  const { connected } = useWallet();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    currentStep,
    completedSteps,
    skipFlow,
    isStepCompleted,
    isStepActive,
    startFlow,
  } = useFlowStore();

  // Show indicator if there's a current step, completed steps, or we should show welcome
  const hasProgress = currentStep !== null || completedSteps.size > 0;

  // If no progress but wallet is connected, show welcome message
  if (!hasProgress && connected) {
    return (
      <div className="bg-card border-2 border-primary/50 rounded-lg p-4 shadow-xl max-w-xs animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary">
            🚀 Welcome to GoDark!
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={skipFlow}
            title="Skip onboarding"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Let's walk through the smart contract flow to get you started with
          trading.
        </p>
        <Button
          onClick={startFlow}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          Start Onboarding
        </Button>
      </div>
    );
  }

  if (!hasProgress) return null;

  const currentIndex = currentStep ? stepOrder.indexOf(currentStep) : -1;
  // Calculate progress based on completed steps if no current step
  const progress =
    currentIndex >= 0
      ? ((currentIndex + 1) / stepOrder.length) * 100
      : (completedSteps.size / stepOrder.length) * 100;

  return (
    <div className="bg-card border-2 border-primary/50 rounded-lg shadow-xl max-w-xs animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-semibold text-primary">
          🚀 Smart Contract Flow
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={skipFlow}
            title="Skip flow"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-1 text-xs">
            {stepOrder.map((step, index) => {
              const completed = isStepCompleted(step);
              const active = isStepActive(step);

              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-2 py-1",
                    active && "text-primary font-medium"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                      completed
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "border-2 border-primary"
                        : "border border-muted-foreground"
                    )}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                  <span
                    className={cn(
                      completed && "line-through text-muted-foreground",
                      active && "text-primary"
                    )}
                  >
                    {stepLabels[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

