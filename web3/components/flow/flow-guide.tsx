"use client";

import { useEffect, useState } from "react";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { useWallet } from "@solana/wallet-adapter-react";
import { StepIndicator } from "./step-indicator";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { useSessionStore } from "@/lib/store/use-session-store";

export function FlowGuide() {
  const { currentStep, skipped, startFlow, isStepCompleted, completeStep } = useFlowStore();
  const { connected } = useWallet();
  const { isOpen: isConsoleOpen } = useDevConsoleStore();
  const { isSessionActive } = useSessionStore();
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders after client hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Auto-start flow if not skipped and wallet is connected
    if (!skipped && !currentStep && connected) {
      // Small delay to ensure wallet state is fully initialized
      const timer = setTimeout(() => {
        const state = useFlowStore.getState();
        // Only start if not already started
        if (!state.currentStep && state.completedSteps.size === 0) {
          startFlow();
          // Auto-complete wallet-connection step since wallet is already connected
          // This handles the case when user completes onboarding and gets redirected
          completeStep("wallet-connection");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connected, skipped, currentStep, startFlow, completeStep]);

  // Auto-complete wallet-connection step if wallet is connected and step is active
  useEffect(() => {
    if (connected && currentStep === "wallet-connection" && !isStepCompleted("wallet-connection")) {
      completeStep("wallet-connection");
    }
  }, [connected, currentStep, isStepCompleted, completeStep]);


  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Don't render if skipped
  if (skipped) {
    return null;
  }

  // Show step indicator if there's a current step, completed steps, or wallet is connected
  const completedCount = Array.from(
    useFlowStore.getState().completedSteps
  ).length;
  const hasStarted = currentStep !== null || completedCount > 0;

  // Show flow guide if wallet is connected (even if flow hasn't started yet)
  if (!connected && !hasStarted) {
    return null;
  }

  // Adjust position when console is open to avoid overlap
  const bottomOffset = isConsoleOpen ? "bottom-[calc(40vh+1rem)]" : "bottom-4";

  return (
    <div className={`fixed ${bottomOffset} left-4 z-[9999] pointer-events-none transition-all duration-300`}>
      <div className="pointer-events-auto">
        <StepIndicator />
      </div>
    </div>
  );
}
