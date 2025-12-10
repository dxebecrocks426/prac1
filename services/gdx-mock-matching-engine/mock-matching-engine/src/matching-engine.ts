import { Order, Trade, OrderRequest } from "./types";
import { PriceService } from "./price-service";

export class MatchingEngine {
  private orders: Map<string, Order> = new Map();
  private listeners: Set<(order: Order) => void> = new Set();
  private orderCounter: number = 0;
  private priceService: PriceService;
  private fillSuccessRate: number;
  private marketSlippageBps: number;

  constructor(
    priceService: PriceService,
    fillSuccessRate: number = 0.95,
    marketSlippageBps: number = 10
  ) {
    this.priceService = priceService;
    this.fillSuccessRate = fillSuccessRate;
    this.marketSlippageBps = marketSlippageBps;
  }

  /**
   * Place an order for matching
   */
  async placeOrder(orderRequest: OrderRequest, tradingViewPrice?: number): Promise<Order> {
    const orderId = `order-${++this.orderCounter}-${Date.now()}`;
    const newOrder: Order = {
      ...orderRequest,
      id: orderId,
      timestamp: Date.now(),
      status: "pending",
      fills: [],
    };

    this.orders.set(orderId, newOrder);

    // Simulate matching with delay
    setTimeout(async () => {
      await this.matchOrder(newOrder, tradingViewPrice);
    }, 100);

    return newOrder;
  }

  /**
   * Match an order against simulated liquidity
   */
  private async matchOrder(order: Order, tradingViewPrice?: number): Promise<void> {
    // Check success rate (simulate occasional failures)
    if (Math.random() > this.fillSuccessRate) {
      order.status = "failed";
      this.notifyListeners(order);
      return;
    }

    // Get current price
    const currentPrice = await this.priceService.getCurrentPrice(order.symbol, tradingViewPrice);

    // Determine fill price
    let fillPrice: number;
    if (order.type === "market") {
      // Market order: fill at current price with slippage
      const slippage = (currentPrice * this.marketSlippageBps) / 10000;
      const slippageDirection = order.side === "buy" ? 1 : -1;
      fillPrice = currentPrice + slippage * slippageDirection;
    } else if (order.type === "limit" && order.price) {
      // Limit order: fill if price crossed
      if (order.side === "buy" && currentPrice <= order.price) {
        fillPrice = order.price; // Fill at limit or better
      } else if (order.side === "sell" && currentPrice >= order.price) {
        fillPrice = order.price;
      } else {
        // Price hasn't crossed limit yet - keep pending
        return;
      }
    } else {
      // Other order types: use current price
      fillPrice = currentPrice;
    }

    // Generate fill
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  /**
   * Generate mock orderbook depth for a symbol
   */
  generateOrderbookDepth(symbol: string, currentPrice: number): {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  } {
    const depth = this.getSymbolDepth(symbol);
    const bids: Array<{ price: number; size: number }> = [];
    const asks: Array<{ price: number; size: number }> = [];

    // Generate bids (below current price)
    for (let i = 0; i < depth.levels; i++) {
      const priceOffset = (i + 1) * depth.tickSize;
      const size = Math.random() * depth.maxSize;
      bids.push({
        price: currentPrice - priceOffset,
        size,
      });
    }

    // Generate asks (above current price)
    for (let i = 0; i < depth.levels; i++) {
      const priceOffset = (i + 1) * depth.tickSize;
      const size = Math.random() * depth.maxSize;
      asks.push({
        price: currentPrice + priceOffset,
        size,
      });
    }

    return { bids, asks };
  }

  /**
   * Get depth configuration for a symbol
   */
  private getSymbolDepth(symbol: string): {
    levels: number;
    tickSize: number;
    maxSize: number;
  } {
    // BTC has deeper liquidity
    if (symbol.includes("BTC")) {
      return { levels: 20, tickSize: 10, maxSize: 50 };
    }
    // ETH has medium liquidity
    if (symbol.includes("ETH")) {
      return { levels: 15, tickSize: 5, maxSize: 30 };
    }
    // Other pairs have less liquidity
    return { levels: 10, tickSize: 1, maxSize: 10 };
  }
}


