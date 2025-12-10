export interface OraclePrice {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

export class OracleSimulator {
  private prices: Map<string, OraclePrice> = new Map();
  private listeners: Set<(price: OraclePrice) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPriceUpdates();
  }

  /**
   * Start periodic price updates
   */
  private startPriceUpdates(): void {
    // Update prices every 1 second
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 1000);
  }

  /**
   * Update prices with small random variations
   */
  private updatePrices(): void {
    const symbols = ["BTC-USDT-PERP", "ETH-USDT-PERP", "SOL-USDT-PERP"];
    const basePrices: Record<string, number> = {
      "BTC-USDT-PERP": 111500,
      "ETH-USDT-PERP": 3500,
      "SOL-USDT-PERP": 150,
    };

    symbols.forEach((symbol) => {
      const basePrice = basePrices[symbol];
      // Random variation of ±0.1%
      const variation = (Math.random() - 0.5) * 0.002;
      const newPrice = basePrice * (1 + variation);

      const price: OraclePrice = {
        symbol,
        price: newPrice,
        timestamp: Date.now(),
        source: "mock-oracle",
      };

      this.prices.set(symbol, price);
      this.notifyListeners(price);
    });
  }

  /**
   * Get current price for a symbol
   */
  getPrice(symbol: string): OraclePrice | undefined {
    return this.prices.get(symbol);
  }

  /**
   * Subscribe to price updates
   */
  subscribe(listener: (price: OraclePrice) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(price: OraclePrice): void {
    this.listeners.forEach((listener) => listener(price));
  }

  /**
   * Calculate funding rate (mock)
   * In production, this would be calculated on-chain based on open interest
   */
  calculateFundingRate(symbol: string): number {
    // Mock funding rate: -0.01% to 0.01%
    return (Math.random() - 0.5) * 0.0002;
  }

  /**
   * Get next funding time (every 8 hours)
   */
  getNextFundingTime(): Date {
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000;
    const nextFunding = Math.ceil(now / eightHours) * eightHours;
    return new Date(nextFunding);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Singleton instance
export const oracleSimulator = new OracleSimulator();


