/**
 * Liquidation Engine API Client
 */

const LIQUIDATION_ENGINE_URL = process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_URL || "http://localhost:8081";

export interface LiquidationEngineStatus {
  running: boolean;
  pid?: number;
  port: number;
  error?: string;
}

export interface LiquidationEngineStats {
  total_liquidations: number;
  success_rate: number;
  pending_liquidations: number;
  insurance_fund_balance: string;
  liquidator_count: number;
}

class LiquidationEngineClient {
  private baseUrl: string;

  constructor(baseUrl: string = LIQUIDATION_ENGINE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if liquidation engine service is running
   */
  async getStatus(): Promise<LiquidationEngineStatus> {
    // Use Next.js API route to check status
    const response = await fetch("/api/liquidation-engine", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        running: false,
        port: 8081,
        error: `Failed to check liquidation engine status: ${response.statusText}`,
      };
    }

    return response.json();
  }

  /**
   * Check liquidation engine health endpoint directly
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
   * Get liquidation engine stats
   */
  async getStats(): Promise<LiquidationEngineStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Start the liquidation engine service
   */
  async start(): Promise<{ success: boolean; pid?: number; ready?: boolean; message?: string }> {
    // Use Next.js API route to start the process
    const response = await fetch("/api/liquidation-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to start liquidation engine: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop the liquidation engine service
   */
  async stop(): Promise<{ success: boolean; message?: string }> {
    const response = await fetch("/api/liquidation-engine", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to stop liquidation engine: ${error.error || response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const liquidationEngineClient = new LiquidationEngineClient();

