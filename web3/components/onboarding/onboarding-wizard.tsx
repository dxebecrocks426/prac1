"use client";

import {
  useOnboardingStore,
  OnboardingStep,
} from "@/lib/store/use-onboarding-store";
import { StartValidatorStep } from "./start-validator-step";
import { CreateWalletStep } from "./create-wallet-step";
import { AirdropSolStep } from "./airdrop-sol-step";
import { MintTokensStep } from "./mint-tokens-step";
import { DeployContractsStep } from "./deploy-contracts-step";
import { StartPositionManagementStep } from "./start-position-management-step";
import { StartSettlementRelayerStep } from "./start-settlement-relayer-step";
import { StartLiquidationEngineStep } from "./start-liquidation-engine-step";
import { StartMockEngineStep } from "./start-mock-engine-step";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { StepCTAProvider, useStepCTA } from "./step-cta-context";

const steps = [
  {
    id: "start-validator",
    label: "Start Validator",
    component: StartValidatorStep,
  },
  { id: "create-wallet", label: "Create Wallet", component: CreateWalletStep },
  { id: "airdrop-sol", label: "Airdrop SOL", component: AirdropSolStep },
  { id: "mint-tokens", label: "Mint Tokens", component: MintTokensStep },
  {
    id: "deploy-contracts",
    label: "Deploy Contracts",
    component: DeployContractsStep,
  },
  {
    id: "start-position-management",
    label: "Start Position Management",
    component: StartPositionManagementStep,
  },
  {
    id: "start-settlement-relayer",
    label: "Start Settlement Relayer",
    component: StartSettlementRelayerStep,
  },
  {
    id: "start-liquidation-engine",
    label: "Start Liquidation Engine",
    component: StartLiquidationEngineStep,
  },
  {
    id: "start-mock-engine",
    label: "Start Mock Engine",
    component: StartMockEngineStep,
  },
];

function OnboardingWizardContent() {
  const {
    currentStep,
    completedSteps,
    markCompleted,
    isCompleted,
    setCurrentStep,
  } = useOnboardingStore();
  const { ctaConfig } = useStepCTA();
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const getCurrentStepIndex = () => {
    return steps.findIndex((s) => s.id === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();
  const CurrentComponent =
    steps[currentStepIndex]?.component || steps[0].component;

  // Ensure completedSteps is a Set (handle persistence deserialization)
  const completedStepsSet = completedSteps instanceof Set 
    ? completedSteps 
    : new Set(Array.isArray(completedSteps) ? completedSteps : []);
  
  const isCurrentStepCompleted = completedStepsSet.has(
    currentStep as OnboardingStep
  );
  const hasNextStep = currentStepIndex < steps.length - 1;
  const nextStep = hasNextStep ? steps[currentStepIndex + 1] : null;

  const handleComplete = () => {
    markCompleted();
  };

  const handleNext = useCallback(() => {
    const currentIdx = steps.findIndex((s) => s.id === currentStep);
    const isCompleted = completedSteps.has(currentStep as OnboardingStep);
    const hasNext = currentIdx < steps.length - 1;
    const next = hasNext ? steps[currentIdx + 1] : null;

    if (isCompleted && next) {
      setCurrentStep(next.id as OnboardingStep);
    }
  }, [currentStep, completedSteps, setCurrentStep]);

  useEffect(() => {
    // If completed, redirect after a short delay with full page reload
    // This ensures the wallet provider reinitializes and auto-connects
    if (isCompleted) {
      const timer = setTimeout(() => {
        window.location.href = "/trade";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  // Auto-focus next button when step completes
  useEffect(() => {
    if (isCurrentStepCompleted && hasNextStep && nextButtonRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        nextButtonRef.current?.focus();
      }, 100);
    }
  }, [isCurrentStepCompleted, hasNextStep]);

  // Keyboard navigation: Enter/Space to proceed to next step
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleNext]);

  if (isCompleted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
          <p className="text-muted-foreground">
            Your localnet wallet is set up with SOL and tokens. Redirecting to
            the trading page...
          </p>
          <Button
            onClick={() => {
              window.location.href = "/trade";
            }}
            className="mt-4"
            size="lg"
          >
            Go to Trading Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedStepsSet.has(step.id as OnboardingStep);
              const isCurrent = step.id === currentStep;
              const isPast = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        isCompleted || isPast
                          ? "bg-green-600 border-green-600 text-white"
                          : isCurrent
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isCompleted || isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1.5 text-center ${
                        isCurrent ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted || isPast ? "bg-green-600" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Component */}
      <div className="min-h-[400px]">
        <CurrentComponent />
      </div>

      {/* Fixed Navigation Footer */}
      <Card className="sticky bottom-0 z-10 shadow-lg mb-[var(--dev-console-height)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {isCurrentStepCompleted && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Step completed</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {completedStepsSet.size >= steps.length && !isCompleted ? (
                <Button
                  onClick={handleComplete}
                  size="lg"
                  className="min-w-[180px]"
                >
                  Complete Onboarding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : isCurrentStepCompleted && hasNextStep && nextStep ? (
                <Button
                  ref={nextButtonRef}
                  onClick={handleNext}
                  size="lg"
                  className="min-w-[180px]"
                  autoFocus
                >
                  Next: {nextStep.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : ctaConfig ? (
                <Button
                  onClick={ctaConfig.onClick}
                  disabled={ctaConfig.disabled}
                  size="lg"
                  variant={ctaConfig.variant || "default"}
                  className="min-w-[180px]"
                >
                  {ctaConfig.loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {ctaConfig.label}
                </Button>
              ) : null}
            </div>
          </div>
          {isCurrentStepCompleted && hasNextStep && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                Enter
              </kbd>{" "}
              or{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                Space
              </kbd>{" "}
              to continue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OnboardingWizard() {
  return (
    <StepCTAProvider>
      <OnboardingWizardContent />
    </StepCTAProvider>
  );
}
