import axios, { AxiosInstance } from "axios";
import { Trade, TradeRequest, TradeResponse, SettlementStatusResponse } from "./types";

export class SettlementIntegration {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:8080") {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Send matched trade to settlement relayer
   */
  async submitTrade(trade: Trade): Promise<TradeResponse> {
    const tradeRequest: TradeRequest = {
      user_id: trade.userId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      timestamp: trade.timestamp,
      trade_id: trade.id, // Include trade_id from matching engine
    };

    try {
      const response = await this.client.post<TradeResponse>("/trades", tradeRequest);
      console.log(`Trade submitted to settlement relayer: ${response.data.trade_id}`);
      return response.data;
    } catch (error: any) {
      console.error("Failed to submit trade to settlement relayer:", error.message);
      throw new Error(`Settlement submission failed: ${error.message}`);
    }
  }

  /**
   * Get settlement batch status
   */
  async getSettlementStatus(batchId: string): Promise<SettlementStatusResponse> {
    try {
      const response = await this.client.get<SettlementStatusResponse>(
        `/settlement/status/${batchId}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Failed to get settlement status:", error.message);
      throw new Error(`Failed to get settlement status: ${error.message}`);
    }
  }

  /**
   * Check if settlement relayer is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}


