/**
 * Position Management API Client
 */

const POSITION_MANAGEMENT_URL = process.env.NEXT_PUBLIC_POSITION_MANAGEMENT_URL || "http://localhost:8081";

export interface PositionManagementStatus {
  running: boolean;
  pid?: number;
  port: number;
  error?: string;
}

class PositionManagementClient {
  private baseUrl: string;

  constructor(baseUrl: string = POSITION_MANAGEMENT_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if position management service is running
   */
  async getStatus(): Promise<PositionManagementStatus> {
    // Use Next.js API route to check status
    const response = await fetch("/api/position-management", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        running: false,
        port: 8081,
        error: `Failed to check position management status: ${response.statusText}`,
      };
    }

    return response.json();
  }

  /**
   * Check position management health endpoint directly
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // Increased timeout to 5 seconds
        mode: "cors", // Explicitly enable CORS
      });
      return response.ok;
    } catch (error) {
      console.debug("[Position Management] Health check failed:", error);
      return false;
    }
  }

  /**
   * Start the position management service
   */
  async start(): Promise<{ success: boolean; pid?: number; ready?: boolean; message?: string }> {
    // Use Next.js API route to start the process
    const response = await fetch("/api/position-management", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to start position management: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop the position management service
   */
  async stop(): Promise<{ success: boolean; message?: string }> {
    const response = await fetch("/api/position-management", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to stop position management: ${error.error || response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const positionManagementClient = new PositionManagementClient();

