import { apiClient } from "./client";

export interface Instrument {
  symbol: string;
  base_asset: string;
  quote_asset: string;
  type: string;
  status: string;
  min_quantity: number;
  max_quantity: number;
  tick_size: number;
  lot_size: number;
}

export interface NBBOStatus {
  symbol: string;
  best_bid: number;
  best_ask: number;
  bid_size: number;
  ask_size: number;
  timestamp: string;
}

export const marketsApi = {
  /**
   * Get list of available trading instruments
   */
  getInstruments: async () => {
    return apiClient.get<Instrument[]>("/get-instruments");
  },

  /**
   * Get NBBO status
   */
  getNBBOStatus: async () => {
    return apiClient.get<NBBOStatus>("/nbbo/status");
  },
};


