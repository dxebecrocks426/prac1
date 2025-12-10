/**
 * Mock Matching Engine API Client
 */

const MOCK_ENGINE_URL = process.env.NEXT_PUBLIC_MOCK_ENGINE_URL || "http://localhost:3003";

export interface OrderRequest {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask";
  quantity: number;
  price?: number;
  leverage: number;
  tradingViewPrice?: number;
}

export interface OrderResponse {
  orderId: string;
  status: string;
  timestamp: number;
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask";
  quantity: number;
  price?: number;
  leverage: number;
  timestamp: number;
  status: "pending" | "matched" | "settling" | "settled" | "cancelled" | "failed";
  fills: Array<{
    id: string;
    userId: string;
    symbol: string;
    side: "LONG" | "SHORT";
    quantity: number;
    price: number;
    timestamp: number;
    orderId: string;
  }>;
}

export interface EngineStatus {
  status: string;
  timestamp: number;
  settlementRelayer: string;
}

class MockEngineClient {
  private baseUrl: string;

  constructor(baseUrl: string = MOCK_ENGINE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if mock engine is running
   */
  async getEngineStatus(): Promise<EngineStatus> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Mock engine health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Start the mock engine
   */
  async startMockEngine(): Promise<{ success: boolean; pid?: number; ready?: boolean; message?: string }> {
    // Use Next.js API route to start the process
    const response = await fetch("/api/mock-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to start mock engine: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop the mock engine
   */
  async stopMockEngine(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/api/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to stop mock engine: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Submit order for matching
   */
  async submitOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    const response = await fetch(`${this.baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderRequest),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to submit order: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/api/orders/${orderId}`);

    if (!response.ok) {
      throw new Error(`Failed to get order status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all orders for a user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    const response = await fetch(`${this.baseUrl}/api/orders/user/${userId}`);

    if (!response.ok) {
      throw new Error(`Failed to get user orders: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update price from TradingView
   */
  async updatePrice(symbol: string, price: number): Promise<{ symbol: string; price: number; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/api/prices/${symbol}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update price: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocketConnection(
    onOrderUpdate: (order: Order) => void,
    onError?: (error: Event) => void
  ): WebSocket {
    const wsUrl = this.baseUrl.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "order_update") {
          onOrderUpdate(data.data);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return ws;
  }
}

// Singleton instance
export const mockEngineClient = new MockEngineClient();

