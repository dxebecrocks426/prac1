import { Trade } from "./trading-engine";

export interface SettlementBatch {
  id: string;
  trades: Trade[];
  netPositions: Map<string, number>; // user_id -> net position delta
  status: "accumulating" | "settling" | "settled";
  createdAt: number;
  settledAt?: number;
}

export class SettlementSimulator {
  private batches: SettlementBatch[] = [];
  private currentBatch: SettlementBatch | null = null;
  private batchWindowMs: number = 1000; // 1 second
  private maxBatchSize: number = 50;
  private listeners: Set<(batch: SettlementBatch) => void> = new Set();

  constructor() {
    this.startBatchTimer();
  }

  /**
   * Add a trade to the current batch
   */
  addTrade(trade: Trade): void {
    if (!this.currentBatch || this.currentBatch.status !== "accumulating") {
      this.createNewBatch();
    }

    if (!this.currentBatch) return;

    this.currentBatch.trades.push(trade);

    // Calculate net position
    const key = `${trade.userId}-${trade.symbol}`;
    const currentNet = this.currentBatch.netPositions.get(key) || 0;
    const delta = trade.side === "LONG" ? trade.quantity : -trade.quantity;
    this.currentBatch.netPositions.set(key, currentNet + delta);

    // Trigger immediate settlement if batch is full
    if (this.currentBatch.trades.length >= this.maxBatchSize) {
      this.settleCurrentBatch();
    }
  }

  /**
   * Create a new batch
   */
  private createNewBatch(): void {
    this.currentBatch = {
      id: `batch-${Date.now()}`,
      trades: [],
      netPositions: new Map(),
      status: "accumulating",
      createdAt: Date.now(),
    };
    this.batches.push(this.currentBatch);
  }

  /**
   * Settle the current batch
   */
  private settleCurrentBatch(): void {
    if (!this.currentBatch || this.currentBatch.status !== "accumulating") {
      return;
    }

    this.currentBatch.status = "settling";

    // Simulate settlement delay
    setTimeout(() => {
      if (this.currentBatch) {
        this.currentBatch.status = "settled";
        this.currentBatch.settledAt = Date.now();
        this.notifyListeners(this.currentBatch);
        this.currentBatch = null;
      }
    }, 500); // 500ms settlement simulation
  }

  /**
   * Start batch timer (settles every 1 second)
   */
  private startBatchTimer(): void {
    setInterval(() => {
      if (this.currentBatch && this.currentBatch.trades.length > 0) {
        this.settleCurrentBatch();
      }
    }, this.batchWindowMs);
  }

  /**
   * Subscribe to batch settlement events
   */
  subscribe(listener: (batch: SettlementBatch) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(batch: SettlementBatch): void {
    this.listeners.forEach((listener) => listener(batch));
  }

  /**
   * Get current batch status
   */
  getCurrentBatch(): SettlementBatch | null {
    return this.currentBatch;
  }

  /**
   * Get recent batches
   */
  getRecentBatches(limit: number = 10): SettlementBatch[] {
    return this.batches
      .filter((b) => b.status === "settled")
      .slice(-limit)
      .reverse();
  }
}

// Singleton instance
export const settlementSimulator = new SettlementSimulator();


