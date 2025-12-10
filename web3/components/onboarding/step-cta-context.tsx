"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface StepCTAConfig {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

interface StepCTAContextType {
  ctaConfig: StepCTAConfig | null;
  setCTAConfig: (config: StepCTAConfig | null) => void;
}

const StepCTAContext = createContext<StepCTAContextType | undefined>(undefined);

export function StepCTAProvider({ children }: { children: ReactNode }) {
  const [ctaConfig, setCTAConfig] = useState<StepCTAConfig | null>(null);

  return (
    <StepCTAContext.Provider value={{ ctaConfig, setCTAConfig }}>
      {children}
    </StepCTAContext.Provider>
  );
}

export function useStepCTA() {
  const context = useContext(StepCTAContext);
  if (!context) {
    throw new Error("useStepCTA must be used within StepCTAProvider");
  }
  return context;
}


