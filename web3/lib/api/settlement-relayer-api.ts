/**
 * Settlement Relayer API Client
 */

const SETTLEMENT_RELAYER_URL = process.env.NEXT_PUBLIC_SETTLEMENT_RELAYER_URL || "http://localhost:8080";

export interface SettlementRelayerStatus {
  running: boolean;
  pid?: number;
  port: number;
  error?: string;
}

export interface SettlementBatchStatus {
  batch_id: string;
  status: string;
  tx_signature?: string | null;
  trade_count: number;
  created_at: string;
}

class SettlementRelayerClient {
  private baseUrl: string;

  constructor(baseUrl: string = SETTLEMENT_RELAYER_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if settlement relayer is running
   */
  async getRelayerStatus(): Promise<SettlementRelayerStatus> {
    // Use Next.js API route to check status
    const response = await fetch("/api/settlement-relayer", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        running: false,
        port: 8080,
        error: `Failed to check relayer status: ${response.statusText}`,
      };
    }

    return response.json();
  }

  /**
   * Check relayer health endpoint directly
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start the settlement relayer
   */
  async startRelayer(): Promise<{ success: boolean; pid?: number; ready?: boolean; message?: string }> {
    // Use Next.js API route to start the process
    const response = await fetch("/api/settlement-relayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to start settlement relayer: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop the settlement relayer
   */
  async stopRelayer(): Promise<{ success: boolean; message?: string }> {
    const response = await fetch("/api/settlement-relayer", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to stop settlement relayer: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get settlement batch status by batch_id
   */
  async getBatchStatus(batchId: string): Promise<SettlementBatchStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/settlement/status/${batchId}`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get batch status: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching batch status:", error);
      return null;
    }
  }

  /**
   * Get batch_id for a trade
   */
  async getBatchByTradeId(tradeId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/settlement/batch-by-trade/${tradeId}`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get batch by trade_id: ${response.statusText}`);
      }

      const batchStatus: SettlementBatchStatus = await response.json();
      return batchStatus.batch_id;
    } catch (error) {
      console.error("Error fetching batch by trade_id:", error);
      return null;
    }
  }

  /**
   * Get all pending batches
   */
  async getPendingBatches(): Promise<SettlementBatchStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/settlement/batches/pending`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get pending batches: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching pending batches:", error);
      return [];
    }
  }
}

// Singleton instance
export const settlementRelayerClient = new SettlementRelayerClient();


