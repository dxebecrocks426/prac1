import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkingOrder {
  algorithmId: string;
  orderId: string;
  dateTime: Date;
  type: string;
  symbol: string;
  side: "buy" | "sell";
  avgFillPrice: number | null;
  avgOrderPrice: number;
  fillQuantity: number;
  orderQuantity: number;
  fillValue: number;
  orderValue: number;
  fillProgress: number;
  status: string;
  batchId?: string; // Settlement batch ID when order is settling
  tradeIds?: string[]; // Trade IDs from fills that were sent to settlement relayer
}

interface OrderHistory extends WorkingOrder {
  completedAt: Date;
}

interface OrdersStore {
  workingOrders: WorkingOrder[];
  orderHistory: OrderHistory[];
  addWorkingOrder: (order: WorkingOrder) => void;
  updateWorkingOrder: (orderId: string, updates: Partial<WorkingOrder>) => void;
  removeWorkingOrder: (orderId: string) => void;
  addToHistory: (order: OrderHistory) => void;
  clearHistory: () => void;
}

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set) => ({
      workingOrders: [],
      orderHistory: [],
      addWorkingOrder: (order) =>
        set((state) => ({
          workingOrders: [...state.workingOrders, order],
        })),
      updateWorkingOrder: (orderId, updates) =>
        set((state) => ({
          workingOrders: state.workingOrders.map((order) =>
            order.orderId === orderId ? { ...order, ...updates } : order
          ),
        })),
      removeWorkingOrder: (orderId) =>
        set((state) => ({
          workingOrders: state.workingOrders.filter(
            (order) => order.orderId !== orderId
          ),
        })),
      addToHistory: (order) =>
        set((state) => ({
          orderHistory: [order, ...state.orderHistory].slice(0, 100), // Keep last 100
        })),
      clearHistory: () =>
        set({
          orderHistory: [],
        }),
    }),
    {
      name: "orders-storage",
    }
  )
);


