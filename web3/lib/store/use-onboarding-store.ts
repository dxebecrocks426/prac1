import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveLocalnetMints } from "@/lib/utils/tokens";

export type OnboardingStep =
  | "welcome"
  | "start-validator"
  | "create-wallet"
  | "airdrop-sol"
  | "mint-tokens"
  | "deploy-contracts"
  | "start-position-management"
  | "start-settlement-relayer"
  | "start-liquidation-engine"
  | "start-mock-engine"
  | "complete";

export interface TokenMintAddresses {
  USDT?: string;
  BTC?: string;
  ETH?: string;
  XRP?: string;
  ADA?: string;
}

export interface DeployedPrograms {
  "collateral-vault"?: string;
  "ephemeral-vault"?: string;
  "funding-rate"?: string;
  oracle?: string;
  "position-mgmt"?: string;
  "settlement-relayer"?: string;
  "liquidation-engine"?: string;
}

interface OnboardingStore {
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
  walletAddress: string | null;
  solBalance: number | null;
  tokenMints: TokenMintAddresses;
  deployedPrograms: DeployedPrograms;
  isCompleted: boolean;

  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  setWalletAddress: (address: string) => void;
  setSolBalance: (balance: number) => void;
  setTokenMint: (symbol: keyof TokenMintAddresses, address: string) => void;
  setDeployedProgram: (
    programId: keyof DeployedPrograms,
    programAddress: string
  ) => void;
  markCompleted: () => void;
  reset: () => void;
}

const stepOrder: OnboardingStep[] = [
  "welcome",
  "start-validator",
  "create-wallet",
  "airdrop-sol",
  "mint-tokens",
  "deploy-contracts",
  "start-position-management",
  "start-settlement-relayer",
  "start-liquidation-engine",
  "start-mock-engine",
  "complete",
];

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      currentStep: "welcome",
      completedSteps: new Set<OnboardingStep>(),
      walletAddress: null,
      solBalance: null,
      tokenMints: {},
      deployedPrograms: {},
      isCompleted: false,

      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      completeStep: (step) => {
        const { completedSteps } = get();
        // Ensure completedSteps is a Set
        const currentSet = completedSteps instanceof Set 
          ? completedSteps 
          : new Set(Array.isArray(completedSteps) ? completedSteps : []);
        const newCompleted = new Set(currentSet);
        newCompleted.add(step);

        // Auto-advance to next step
        const currentIndex = stepOrder.indexOf(step);
        const nextStep =
          currentIndex < stepOrder.length - 1
            ? stepOrder[currentIndex + 1]
            : null;

        set({
          completedSteps: newCompleted,
          currentStep: nextStep || step,
        });
      },

      setWalletAddress: (address) => {
        set({ walletAddress: address });
      },

      setSolBalance: (balance) => {
        set({ solBalance: balance });
      },

      setTokenMint: (symbol, address) => {
        const { tokenMints } = get();
        const newTokenMints = {
          ...tokenMints,
          [symbol]: address,
        };
        set({ tokenMints: newTokenMints });
        // Also sync to localStorage location that getUsdtMint() expects
        saveLocalnetMints(newTokenMints as Record<string, string>);
      },

      setDeployedProgram: (programId, programAddress) => {
        const { deployedPrograms } = get();
        set({
          deployedPrograms: {
            ...deployedPrograms,
            [programId]: programAddress,
          },
        });
      },

      markCompleted: () => {
        set({ isCompleted: true, currentStep: "complete" });
      },

      reset: () => {
        set({
          currentStep: "welcome",
          completedSteps: new Set(),
          walletAddress: null,
          solBalance: null,
          tokenMints: {},
          deployedPrograms: {},
          isCompleted: false,
        });
      },
    }),
    {
      name: "localnet-onboarding-storage",
      // Custom serialization/deserialization for Set
      partialize: (state) => ({
        ...state,
        completedSteps: Array.from(state.completedSteps),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert array back to Set on rehydration
          state.completedSteps = new Set(
            Array.isArray(state.completedSteps)
              ? state.completedSteps
              : []
          );
        }
      },
    }
  )
);
