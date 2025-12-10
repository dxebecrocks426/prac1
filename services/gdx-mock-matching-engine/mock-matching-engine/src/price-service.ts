import axios from "axios";

interface PriceCache {
  price: number;
  timestamp: number;
}

export class PriceService {
  private cache: Map<string, PriceCache> = new Map();
  private cacheTtl: number;
  private binanceApiUrl: string;

  constructor(cacheTtlMs: number = 2000, binanceApiUrl: string = "https://api.binance.com/api/v3") {
    this.cacheTtl = cacheTtlMs;
    this.binanceApiUrl = binanceApiUrl;
  }

  /**
   * Get current price for a symbol
   * Primary: Extract from TradingView DOM (handled by frontend)
   * Fallback: Use Binance API
   */
  async getCurrentPrice(symbol: string, tradingViewPrice?: number): Promise<number> {
    // Use TradingView price if provided (from frontend DOM extraction)
    if (tradingViewPrice !== undefined) {
      this.cache.set(symbol, {
        price: tradingViewPrice,
        timestamp: Date.now(),
      });
      return tradingViewPrice;
    }

    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.price;
    }

    // Fallback to Binance API
    try {
      const price = await this.fetchFromBinance(symbol);
      this.cache.set(symbol, {
        price,
        timestamp: Date.now(),
      });
      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      
      // Return cached price even if expired, or fallback to mock price
      if (cached) {
        return cached.price;
      }
      
      return this.getMockPrice(symbol);
    }
  }

  /**
   * Fetch price from Binance API
   */
  private async fetchFromBinance(symbol: string): Promise<number> {
    // Convert BTC-USDT-PERP to BTCUSDT
    const binanceSymbol = this.convertToBinanceSymbol(symbol);
    
    const response = await axios.get(`${this.binanceApiUrl}/ticker/price`, {
      params: { symbol: binanceSymbol },
      timeout: 5000,
    });

    return parseFloat(response.data.price);
  }

  /**
   * Convert GoDark symbol format to Binance format
   */
  private convertToBinanceSymbol(symbol: string): string {
    // BTC-USDT-PERP -> BTCUSDT
    const parts = symbol.split("-");
    if (parts.length >= 2) {
      return `${parts[0]}${parts[1]}`;
    }
    return symbol.replace("-", "");
  }

  /**
   * Get mock price as fallback
   */
  private getMockPrice(symbol: string): number {
    const prices: Record<string, number> = {
      "BTC-USDT-PERP": 111500,
      "ETH-USDT-PERP": 3500,
      "SOL-USDT-PERP": 150,
      "XRP-USDT-PERP": 0.6,
      "ADA-USDT-PERP": 0.5,
    };
    return prices[symbol] || 100;
  }

  /**
   * Update price from TradingView (called by frontend)
   */
  updatePrice(symbol: string, price: number): void {
    this.cache.set(symbol, {
      price,
      timestamp: Date.now(),
    });
  }
}


