import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FlowStep =
  | "wallet-connection"
  | "collateral-vault-setup"
  | "place-trade"
  | "settlement-relayer"
  | "position-management"
  | "oracle-funding-rate";

interface FlowStore {
  currentStep: FlowStep | null;
  completedSteps: Set<FlowStep>;
  skipped: boolean;
  startFlow: () => void;
  completeStep: (step: FlowStep) => void;
  setCurrentStep: (step: FlowStep | null) => void;
  skipFlow: () => void;
  restartFlow: () => void;
  isStepCompleted: (step: FlowStep) => boolean;
  isStepActive: (step: FlowStep) => boolean;
}

interface FlowStorePersist {
  currentStep: FlowStep | null;
  completedSteps: FlowStep[];
  skipped: boolean;
}

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      currentStep: null,
      completedSteps: new Set<FlowStep>(),
      skipped: false,

      startFlow: () => {
        set({
          currentStep: "wallet-connection",
          skipped: false,
        });
      },

      completeStep: (step: FlowStep) => {
        const { completedSteps, currentStep } = get();
        const newCompleted = new Set(completedSteps);
        newCompleted.add(step);

        // Auto-advance to next step
        const stepOrder: FlowStep[] = [
          "wallet-connection",
          "collateral-vault-setup",
          "place-trade",
          "settlement-relayer",
          "position-management",
          "oracle-funding-rate",
        ];

        const currentIndex = stepOrder.indexOf(step);
        const nextStep =
          currentIndex < stepOrder.length - 1
            ? stepOrder[currentIndex + 1]
            : null;

        set({
          completedSteps: newCompleted,
          currentStep: nextStep,
        });
      },

      setCurrentStep: (step: FlowStep | null) => {
        set({ currentStep: step });
      },

      skipFlow: () => {
        set({ skipped: true, currentStep: null });
      },

      restartFlow: () => {
        set({
          currentStep: "wallet-connection",
          completedSteps: new Set<FlowStep>(),
          skipped: false,
        });
      },

      isStepCompleted: (step: FlowStep) => {
        return get().completedSteps.has(step);
      },

      isStepActive: (step: FlowStep) => {
        return get().currentStep === step;
      },
    }),
    {
      name: "flow-storage",
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: Array.from(state.completedSteps),
        skipped: state.skipped,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.completedSteps)) {
          state.completedSteps = new Set(state.completedSteps);
        }
      },
    }
  )
);

