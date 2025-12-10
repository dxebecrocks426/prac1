import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Position } from "@/lib/anchor/types";

interface PositionsStore {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  updatePosition: (symbol: string, updates: Partial<Position>) => void;
  removePosition: (symbol: string) => void;
}

export const usePositionsStore = create<PositionsStore>()(
  persist(
    (set) => ({
      positions: [],
      setPositions: (positions) => set({ positions }),
      updatePosition: (symbol, updates) =>
        set((state) => ({
          positions: state.positions.map((pos) =>
            pos.symbol === symbol ? { ...pos, ...updates } : pos
          ),
        })),
      removePosition: (symbol) =>
        set((state) => ({
          positions: state.positions.filter((pos) => pos.symbol !== symbol),
        })),
    }),
    {
      name: "positions-storage",
    }
  )
);


