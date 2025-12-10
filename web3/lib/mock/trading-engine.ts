export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  price: number;
  timestamp: number;
  orderId: string;
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
  status: "pending" | "matched" | "settling" | "settled" | "cancelled";
  fills: Trade[];
}

export class MockTradingEngine {
  private orders: Map<string, Order> = new Map();
  private listeners: Set<(order: Order) => void> = new Set();
  private orderCounter: number = 0;
  private useMockEngineService: boolean = false;
  private mockEngineWs: WebSocket | null = null;
  private mockEngineAvailable: boolean = false;

  /**
   * Check if mock engine service is available
   */
  async checkMockEngineAvailability(): Promise<boolean> {
    try {
      const { mockEngineClient } = await import("@/lib/api/mock-engine-api");
      const status = await mockEngineClient.getEngineStatus();
      this.mockEngineAvailable = status.status === "ok";
      return this.mockEngineAvailable;
    } catch (error) {
      this.mockEngineAvailable = false;
      return false;
    }
  }

  /**
   * Initialize WebSocket connection to mock engine service
   */
  async initializeMockEngineConnection(): Promise<void> {
    if (this.mockEngineWs) {
      return; // Already connected
    }

    try {
      const { mockEngineClient } = await import("@/lib/api/mock-engine-api");
      this.mockEngineWs = mockEngineClient.createWebSocketConnection(
        (order) => {
          // Update local order state
          this.orders.set(order.id, order);
          this.notifyListeners(order);
        },
        (error) => {
          console.error("Mock engine WebSocket error:", error);
          this.mockEngineWs = null;
        }
      );
      this.useMockEngineService = true;
    } catch (error) {
      console.warn("Failed to connect to mock engine service, using in-browser matching:", error);
      this.useMockEngineService = false;
    }
  }

  /**
   * Place an order (mock matching engine)
   */
  async placeOrder(
    order: Omit<Order, "id" | "timestamp" | "status" | "fills">,
    tradingViewPrice?: number
  ): Promise<Order> {
    // Check if mock engine service is available
    if (!this.useMockEngineService) {
      const isAvailable = await this.checkMockEngineAvailability();
      if (isAvailable) {
        await this.initializeMockEngineConnection();
      }
    }

    // Use mock engine service if available
    if (this.useMockEngineService && this.mockEngineAvailable) {
      try {
        const { mockEngineClient } = await import("@/lib/api/mock-engine-api");
        const response = await mockEngineClient.submitOrder({
          userId: order.userId,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          price: order.price,
          leverage: order.leverage,
          tradingViewPrice,
        });

        // Create order object from response
        const newOrder: Order = {
          ...order,
          id: response.orderId,
          timestamp: response.timestamp,
          status: response.status as Order["status"],
          fills: [],
        };

        this.orders.set(newOrder.id, newOrder);
        return newOrder;
      } catch (error) {
        console.warn("Failed to submit to mock engine service, falling back to in-browser matching:", error);
        this.useMockEngineService = false;
        // Fall through to in-browser matching
      }
    }

    // Fallback to in-browser matching
    const orderId = `order-${++this.orderCounter}-${Date.now()}`;
    const newOrder: Order = {
      ...order,
      id: orderId,
      timestamp: Date.now(),
      status: "pending",
      fills: [],
    };

    this.orders.set(orderId, newOrder);

    // Simulate immediate matching for market orders
    if (order.type === "market") {
      setTimeout(() => {
        this.matchOrder(newOrder);
      }, 100);
    }

    return newOrder;
  }

  /**
   * Match an order (mock)
   */
  private matchOrder(order: Order): void {
    // Mock: immediately fill the order
    const fillPrice = order.price || this.getMockPrice(order.symbol);
    const trade: Trade = {
      id: `trade-${Date.now()}`,
      userId: order.userId,
      symbol: order.symbol,
      side: order.side === "buy" ? "LONG" : "SHORT",
      quantity: order.quantity,
      price: fillPrice,
      timestamp: Date.now(),
      orderId: order.id,
    };

    order.fills.push(trade);
    order.status = "matched";

    this.notifyListeners(order);

    // Move to settling after a short delay
    setTimeout(() => {
      order.status = "settling";
      this.notifyListeners(order);
    }, 200);
  }

  /**
   * Get mock price for a symbol
   */
  private getMockPrice(symbol: string): number {
    // Mock prices
    const prices: Record<string, number> = {
      "BTC-USDT-PERP": 111500,
      "ETH-USDT-PERP": 3500,
      "SOL-USDT-PERP": 150,
    };
    return prices[symbol] || 100;
  }

  /**
   * Subscribe to order updates
   */
  subscribe(listener: (order: Order) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(order: Order): void {
    this.listeners.forEach((listener) => listener(order));
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders for a user
   */
  getUserOrders(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId
    );
  }
}

// Singleton instance
export const mockTradingEngine = new MockTradingEngine();

