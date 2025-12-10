import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EventType =
  | "transaction"
  | "airdrop"
  | "mint"
  | "deploy"
  | "authorize"
  | "deposit"
  | "withdraw"
  | "revoke"
  | "error"
  | "info"
  | "validator"
  | "trade"
  | "order";

export interface DevConsoleEvent {
  id: string;
  type: EventType;
  timestamp: string;
  message: string;
  transaction?: string;
  status?: "success" | "failed" | "pending";
  details?: Record<string, unknown>;
}

export interface CPICall {
  id: string;
  timestamp: string;
  fromProgram: string;
  toProgram: string;
  instruction: string;
  success: boolean;
  transaction: string;
}

interface DevConsoleStore {
  events: DevConsoleEvent[];
  maxEvents: number;
  isOpen: boolean;
  cpiHistory: CPICall[];
  maxCPIs: number;
  setIsOpen: (open: boolean) => void;
  addEvent: (event: Omit<DevConsoleEvent, "id" | "timestamp">) => void;
  clearEvents: () => void;
  addCPICall: (call: Omit<CPICall, "id" | "timestamp">) => void;
  clearCPIs: () => void;
}

export const useDevConsoleStore = create<DevConsoleStore>()(
  persist(
    (set, get) => ({
      events: [],
      maxEvents: 100,
      isOpen: false,
      cpiHistory: [],
      maxCPIs: 50,

      setIsOpen: (open) => {
        set({ isOpen: open });
      },

      addEvent: (event) => {
        const { events, maxEvents } = get();
        const newEvent: DevConsoleEvent = {
          ...event,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        const updatedEvents = [newEvent, ...events].slice(0, maxEvents);

        set({ events: updatedEvents });
      },

      clearEvents: () => {
        set({ events: [] });
      },

      addCPICall: (call) => {
        const { cpiHistory, maxCPIs } = get();
        const newCPICall: CPICall = {
          ...call,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        const updatedCPIs = [newCPICall, ...cpiHistory].slice(0, maxCPIs);

        set({ cpiHistory: updatedCPIs });
      },

      clearCPIs: () => {
        set({ cpiHistory: [] });
      },
    }),
    {
      name: "dev-console-storage",
      partialize: (state) => ({
        events: state.events,
        maxEvents: state.maxEvents,
        isOpen: state.isOpen,
        cpiHistory: state.cpiHistory,
        maxCPIs: state.maxCPIs,
      }),
    }
  )
);
